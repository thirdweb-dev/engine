import { promises as fs } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

import { FastifyInstance, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import pg, { Knex } from "knex";
import { env } from "../env";
import { createCustomError } from "../error/customError";
import { connectToDatabase } from "./dbConnect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbClient = env.DATABASE_CLIENT;
const connectionString = env.POSTGRES_CONNECTION_URL;

const DATABASE_NAME =
  new URL(connectionString).pathname.split("/")[1] || "postgres";

export const checkTablesExistence = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    const knex = await connectToDatabase();
    // Check if the tables Exists
    const tablesList: string[] = env.DB_TABLES_LIST.split(",").map(function (
      item: any,
    ) {
      return item.trim();
    });

    if (!tablesList) {
      const error = createCustomError(
        "DB_TABLES_LIST ENV variable is empty",
        StatusCodes.NOT_FOUND,
        "DB_TABLES_LIST_NOT_FOUND",
      );
      throw error;
    }

    for (const tableName of tablesList) {
      const schemaSQL = await fs.readFile(
        `${__dirname}/sql-schemas/${tableName}.sql`,
        "utf-8",
      );
      // Create Table using schema
      await knex.schema.raw(schemaSQL);

      server.log.info(
        `SQL for  ${tableName} processed successfully on start-up`,
      );
    }

    // Disconnect from DB
    await knex.destroy();
  } catch (error: any) {
    server.log.error(error);
    const customError = createCustomError(
      "Error while executing Table SQLs on startup",
      StatusCodes.INTERNAL_SERVER_ERROR,
      "SERVER_STARTUP_TABLES_CREATION_ERROR",
    );
    throw customError;
  }
};

export const implementTriggerOnStartUp = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectToDatabase();

    const triggersList: string[] = env.DB_TRIGGERS_LIST.split(",").map(
      function (item: any) {
        return item.trim();
      },
    );

    if (!triggersList) {
      const error = createCustomError(
        "DB_TRIGGERS_LIST ENV variable is empty",
        StatusCodes.NOT_FOUND,
        "DB_TRIGGERS_LIST_NOT_FOUND",
      );
      throw error;
    }

    for (const dbTriggers of triggersList) {
      try {
        server.log.debug(`Reading Trigger File ${dbTriggers}.sql`);
        const schemaSQL = await fs.readFile(
          `${__dirname}/sql-schemas/${dbTriggers}.sql`,
          "utf-8",
        );
        await knex.raw(schemaSQL);
      } catch (error) {
        const customError = createCustomError(
          "Error when executing triggers.",
          StatusCodes.INTERNAL_SERVER_ERROR,
          "INTERNAL_SERVER_ERROR",
        );
        throw customError;
      }

      server.log.info(
        `Trigger ${dbTriggers} created/replaced on startup successfully`,
      );
    }

    // Disconnect from DB
    await knex.destroy();
  } catch (error: any) {
    const customError = createCustomError(
      "Error while executing Trigger/Notification SQLs on startup",
      StatusCodes.INTERNAL_SERVER_ERROR,
      "SERVER_STARTUP_TRIGGER_CREATION_ERROR",
    );
    throw customError;
  }
};

export const ensureDatabaseExists = async (
  server: FastifyInstance | FastifyRequest,
): Promise<void> => {
  try {
    // Creating KNEX Config
    let modifiedConnectionString = connectionString;
    if (DATABASE_NAME !== "postgres") {
      // This is required if the Database mentioned in the connection string is not postgres
      // as we need to connect to the postgres database to create the user provied database
      // and then connect to the user provided database
      modifiedConnectionString = connectionString.replace(
        `/${DATABASE_NAME}`,
        "/postgres",
      );
    }

    let knexConfig: Knex.Config = {
      client: dbClient,
      connection: modifiedConnectionString,
      acquireConnectionTimeout: 10000,
    };

    // Set the appropriate databse client package
    let dbClientPackage: any;
    switch (dbClient) {
      case "pg":
        dbClientPackage = pg;
        break;
      default:
        throw new Error(`Unsupported database client: ${dbClient}`);
    }

    let knex = dbClientPackage(knexConfig);

    // Check if Database Exists & create if it doesn't
    let hasDatabase: any;
    switch (dbClient) {
      case "pg":
        server.log.debug("checking if pg database exists");
        hasDatabase = await knex.raw(
          `SELECT 1 from pg_database WHERE datname = '${DATABASE_NAME}'`,
        );
        server.log.info(`CHECKING for Database ${DATABASE_NAME}...`);
        if (!hasDatabase.rows.length) {
          await knex.raw(`CREATE DATABASE ${DATABASE_NAME}`);
        } else {
          server.log.info(`Database ${DATABASE_NAME} already exists`);
        }
        break;
      default:
        throw new Error(
          `Unsupported database client: ${dbClient}. Cannot create database ${DATABASE_NAME}`,
        );
    }

    // Updating knex Config
    knexConfig = {
      client: dbClient,
      connection: connectionString,
    };

    await knex.destroy();
  } catch (error) {
    server.log.error(error);
    throw new Error(`Error creating database ${DATABASE_NAME}`);
  }
};

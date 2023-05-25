import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { getEnv } from "../loadEnv";
import { connectWithDatabase } from "./dbConnect";
import { FastifyInstance } from "fastify";
import { createCustomError } from "../customError";
import { StatusCodes } from "http-status-codes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const checkTablesExistence = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectWithDatabase(server);

    server.log.info("thirdweb DB connected");

    // Check if the tables Exists
    const tablesList: string[] = getEnv("DB_TABLES_LIST")
      .split(",")
      .map(function (item) {
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
      server.log.info("processing table", tableName);
      let tableExists: boolean;
      try {
        tableExists = await knex.schema.hasTable(tableName);
      } catch (error: any) {
        server.log.info(`DB Init Error`);
        console.log(`DB Init Error`, error);
        throw error;
      }

      if (!tableExists) {
        try {
          server.log.info("creating table", tableName);
          const schemaSQL = await fs.readFile(
            `${__dirname}/../../../sql-schemas/${tableName}.sql`,
            "utf-8",
          );
          server.log.info("file read, executing SQL", tableName);
          // Create Table using schema
          await knex.schema.raw(schemaSQL);
        } catch (error: any) {
          server.log.info("DB Init Error", error);
          throw error;
        }

        server.log.info(`Table ${tableName} created on startup successfully`);
      } else {
        server.log.info(`Table ${tableName} already exists`);
      }
    }

    // Disconnect from DB
    await knex.destroy();
  } catch (error: any) {
    const customError = createCustomError(
      error.message,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    );
    throw customError;
  }
};

export const implementTriggerOnStartUp = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectWithDatabase(server);

    const triggersList: string[] = getEnv("DB_TRIGGERS_LIST")
      .split(",")
      .map(function (item) {
        return item.trim();
      });

    if (!triggersList) {
      const error = createCustomError(
        "DB_TRIGGERS_LIST ENV variable is empty",
        StatusCodes.NOT_FOUND,
        "DB_TRIGGERS_LIST_NOT_FOUND",
      );
      throw error;
    }

    for (const dbTriggers of triggersList) {
      server.log.debug(`Reading Trigger File ${dbTriggers}.sql`);
      const schemaSQL = await fs.readFile(
        `${__dirname}/../../../sql-schemas/${dbTriggers}.sql`,
        "utf-8",
      );
      await knex.raw(schemaSQL);
      server.log.debug(
        `Trigger ${dbTriggers} created/replaced on startup successfully`,
      );
    }

    // Disconnect from DB
    await knex.destroy();
  } catch (error: any) {
    const customError = createCustomError(
      error.message,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "INTERNAL_SERVER_ERROR",
    );
    throw customError;
  }
};

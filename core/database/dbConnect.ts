import { FastifyInstance, FastifyRequest } from "fastify";
import pg, { Knex } from "knex";
import { env } from "../env";

// Defaults to postgres
const dbClient = env.DATABASE_CLIENT;
const connectionString = env.POSTGRES_CONNECTION;

const DATABASE_NAME = "postgres"; //TODO get the db off connection string

export const connectToDB = async (
  server: FastifyInstance | FastifyRequest,
): Promise<Knex> => {
  // Creating KNEX Config

  let knexConfig: Knex.Config = {
    client: dbClient,
    connection: connectionString,
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

  // Updated the DATABASE name on connection object
  connection.database = DATABASE_NAME;

  // Updating knex Config
  knexConfig = {
    client: dbClient,
    connection,
  };

  await knex.destroy();
  // re-instantiate connection with new config
  knex = dbClientPackage(knexConfig);

  return knex;
};

export const connectWithDatabase = async (): Promise<Knex> => {
  let knexConfig: Knex.Config = {
    client: dbClient,
    connection,
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

  // instantiate connection with new config
  const knex = dbClientPackage(knexConfig);

  return knex;
};

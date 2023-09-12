import { FastifyInstance, FastifyRequest } from "fastify";
import pg, { Knex } from "knex";
import { env } from "../env";

// Defaults to postgres
const dbClient = env.DATABASE_CLIENT;
const connectionString = env.POSTGRES_CONNECTION_URL;

const DATABASE_NAME = new URL(connectionString).pathname.split("/")[1];

export const connectToDB = async (
  server: FastifyInstance | FastifyRequest,
): Promise<Knex> => {
  // Creating KNEX Config

  let knexConfig: Knex.Config = {
    client: dbClient,
    connection: connectionString,
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
  try {
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
  } catch (err) {
    server.log.error(err);
    throw new Error(`Error creating database ${DATABASE_NAME}`);
  }

  // Updating knex Config
  knexConfig = {
    client: dbClient,
    connection: connectionString,
  };

  await knex.destroy();
  // re-instantiate connection with new config
  knex = dbClientPackage(knexConfig);

  return knex;
};

export const connectWithDatabase = async (): Promise<Knex> => {
  let knexConfig: Knex.Config = {
    client: dbClient,
    connection: connectionString,
  };

  // Set the appropriate databse client package
  let dbClientPackage: typeof pg;
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

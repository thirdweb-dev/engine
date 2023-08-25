import { FastifyInstance, FastifyRequest } from "fastify";
import pg, { Knex } from "knex";
import { env } from "../env";

const DATABASE_NAME = env.POSTGRES_DATABASE_NAME;

// Defaults to postgres
const dbClient = env.DATABASE_CLIENT;

// Database Connection Setup// Database Connection Setup
let connection: Knex.PgConnectionConfig = {
  host: env.POSTGRES_HOST,
  user: env.POSTGRES_USER,
  port: env.POSTGRES_PORT,
  password: env.POSTGRES_PASSWORD,
  database: DATABASE_NAME,
  ssl: env.POSTGRES_USE_SSL
    ? {
        rejectUnauthorized: false,
      }
    : false,
};

export const connectToDB = async (
  server: FastifyInstance | FastifyRequest,
): Promise<Knex> => {
  // Creating KNEX Config

  // Adding the below as by default PG created the below database
  // We connect to this as a default and then create the DB passed an ENV variable
  connection.database = "postgres";
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

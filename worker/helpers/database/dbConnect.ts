import knex, { Knex } from "knex";
import pg from "knex";
import { getEnv } from "../loadEnv";
import { FastifyInstance } from "fastify";

const DATABASE_NAME = getEnv("POSTGRES_DATABASE_NAME");

// Defaults to postgres
const dbClient = getEnv("DATABASE_CLIENT") ?? "pg";

export const connectToDB = async (server: FastifyInstance): Promise<Knex> => {
  // Creating KNEX Config
  let connection: Knex.PgConnectionConfig = {
    host: getEnv("POSTGRES_HOST"),
    user: getEnv("POSTGRES_USER"),
    password: getEnv("POSTGRES_PASSWORD"),
    database: DATABASE_NAME,
    ssl:
      getEnv("NODE_ENV") === "production"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  };

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

  server.log.info(`Connected to ${DATABASE_NAME} database`);
  return dbClientPackage(knexConfig);
};

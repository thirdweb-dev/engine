import pg, { Knex } from "knex";
import { env } from "../env";

// Defaults to postgres
const dbClient = env.DATABASE_CLIENT;
const connectionString = env.POSTGRES_CONNECTION_URL;

export const connectToDatabase = async (): Promise<Knex> => {
  let knexConfig: Knex.Config = {
    client: dbClient,
    connection: {
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    },
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

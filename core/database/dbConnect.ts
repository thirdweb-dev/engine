import pg, { Knex } from "knex";
import { env } from "../../src/utils/env";

// Defaults to postgres
const connectionString = env.POSTGRES_CONNECTION_URL;

export const connectToDatabase = async (
  databaseURL?: string,
): Promise<Knex> => {
  let knexConfig: Knex.Config = {
    client: "pg",
    connection: {
      connectionString: databaseURL || connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    },
    acquireConnectionTimeout: 10000,
  };

  // instantiate connection with new config
  const knex = pg(knexConfig);

  return knex;
};

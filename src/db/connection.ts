import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../lib/env.js";
import * as schema from "./schema.js";

const primaryDb = drizzle(
  new pg.Pool({
    connectionString: env.POSTGRES_CONNECTION_URL,
  }),
  { schema }
);

export const db = primaryDb;

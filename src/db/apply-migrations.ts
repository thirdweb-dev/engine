import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { env } from "../lib/env.js";
import { initializeLogger } from "../lib/logger.js";
import * as schema from "./schema.js";

const ZEET_ENVIRONMENT = process.env.ZEET_ENVIRONMENT;
// zeet env to run migrations on
const ZEET_ENVS = ["main", "production"];

const migrationLogger = initializeLogger("migrations");

export async function applyMigrations() {
  const canRunMigration =
    (ZEET_ENVIRONMENT && ZEET_ENVS.includes(ZEET_ENVIRONMENT)) ||
    process.env.NODE_ENV === "test" ||
    env.FORCE_DB_MIGRATION;
  // only run migrations on zeet environments that aren't feature branches
  if (canRunMigration) {
    migrationLogger.info(
      "Running migrations on zeet environment:",
      ZEET_ENVIRONMENT
    );

    const client = new pg.Client({
      connectionString: env.POSTGRES_CONNECTION_URL,
    });

    await client.connect();

    const db = drizzle(client, { schema });
    await migrate(db, {
      migrationsFolder: "./drizzle",
    });

    await client.end();
    migrationLogger.info("Migrations complete");
  } else {
    migrationLogger.info(
      "Not on zeet, or on feature branch, skipping migrations"
    );
  }
}

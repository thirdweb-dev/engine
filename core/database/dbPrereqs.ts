import { promises as fs } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../env";
import { createCustomError } from "../error/customError";
import { connectToDatabase } from "./dbConnect";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbClient = env.DATABASE_CLIENT;
const connectionString = env.POSTGRES_CONNECTION_URL;

const DATABASE_NAME =
  new URL(connectionString).pathname.split("/")[1] || "postgres";

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

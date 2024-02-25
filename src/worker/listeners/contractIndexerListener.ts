import { IndexedContracts } from "@prisma/client";
import { knex } from "../../db/client";
import { logger } from "../../utils/logger";

export const contractIndexerListener = async (): Promise<void> => {
  logger({
    service: "worker",
    level: "info",
    message: `Listening for insert or delete on IndexedContracts`,
  });

  const connection = await knex.client.acquireConnection();
  connection.query("LISTEN indexed_contracts_events");

  connection.on(
    "notification",
    async (msg: { channel: string; payload: string }) => {
      const payload = JSON.parse(msg.payload);
      const row = payload.data as IndexedContracts;
      const operation = payload.op as "INSERT" | "DELETE";

      logger({
        service: "worker",
        level: "info",
        message: `Received ${operation} event for IndexedContracts`,
      });
    },
  );

  connection.on("end", async () => {
    await knex.destroy();
    knex.client.releaseConnection(connection);

    logger({
      service: "worker",
      level: "info",
      message: `Released database connection on end`,
    });
  });

  connection.on("error", async (err: any) => {
    logger({
      service: "worker",
      level: "error",
      message: `Database connection error`,
      error: err,
    });

    await knex.destroy();
    knex.client.releaseConnection(connection);

    logger({
      service: "worker",
      level: "info",
      message: `Released database connection on error`,
      error: err,
    });
  });
};

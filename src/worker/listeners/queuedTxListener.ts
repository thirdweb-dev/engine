import PQueue from "p-queue";
import { knex } from "../../db/client";
import { logger } from "../../utils/logger";
import { processTx } from "../tasks/processTx";

const queue = new PQueue({
  concurrency: 1,
  autoStart: true,
});

queue.on("error", (err) => {
  logger({
    service: "worker",
    level: "error",
    message: `[Queue Error] Size: ${queue.size}, Pending: ${queue.pending}`,
    error: err,
  });

  throw err;
});

export const queuedTxListener = async (): Promise<void> => {
  logger({
    service: "worker",
    level: "info",
    message: `Listening for queued transactions`,
  });

  // TODO: This doesn't even need to be a listener
  const connection = await knex.client.acquireConnection();
  connection.query(`LISTEN new_transaction_data`);

  // Queue transaction processing immediately on startup
  queue.add(processTx);

  // Whenever we receive a new transaction, process it
  connection.on(
    "notification",
    async (msg: { channel: string; payload: string }) => {
      queue.add(processTx);
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

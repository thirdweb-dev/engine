import PQueue from "p-queue";
import { knex } from "../../db/client";
import { sendTxWebhook } from "../../server/utils/webhook";
import { logger } from "../../utils/logger";
import { processTx } from "../tasks/processTx";

const queue = new PQueue({
  concurrency: 1,
  autoStart: true,
});

queue.on("error", (err) => {
  logger.worker.error(
    `[Queue Error] Size: ${queue.size}, Pending: ${queue.pending}\n${err}`,
  );
  throw err;
});

export const queuedTxListener = async (): Promise<void> => {
  logger.worker.info(`Listening for queued transactions`);

  // TODO: This doesn't even need to be a listener
  const connection = await knex.client.acquireConnection();
  connection.query(`LISTEN new_transaction_data`);

  // Queue transaction processing immediately on startup
  queue.add(processTx);

  // Whenever we receive a new transaction, process it
  connection.on(
    "notification",
    async (msg: { channel: string; payload: string }) => {
      const parsedPayload = JSON.parse(msg.payload);
      await sendTxWebhook(parsedPayload);
      queue.add(processTx);
    },
  );

  connection.on("end", async () => {
    await knex.destroy();
    knex.client.releaseConnection(connection);

    logger.worker.info(`Released database connection on end`);
  });

  connection.on("error", async (err: any) => {
    logger.worker.error(err);
    await knex.destroy();
    knex.client.releaseConnection(connection);

    logger.worker.info(`Released database connection on error`);
  });
};

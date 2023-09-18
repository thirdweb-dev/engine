import { connectToDatabase } from "../../core";
import { logger } from "../../src/utils/logger";
import { queue } from "../services/pQueue";
import { processTransaction } from "./processTransaction";

const beginTransactionProcessing = () => {
  return async () => {
    logger.worker.info(`--- processing Q request started at ${new Date()} ---`);
    await processTransaction();
    logger.worker.info(`--- processing Q request ended at ${new Date()} ---`);
  };
};

export const startNotificationListener = async (): Promise<void> => {
  try {
    logger.worker.info(`Starting notification listener`);
    // Acquire a connection
    const knex = await connectToDatabase();
    const connection = await knex.client.acquireConnection();
    connection.query("LISTEN new_transaction_data");

    // Adding to Queue to Process Requests
    queue.add(beginTransactionProcessing());

    connection.on(
      "notification",
      async (msg: { channel: string; payload: string }) => {
        queue.add(beginTransactionProcessing());
      },
    );

    connection.on("end", async () => {
      logger.worker.info(`Connection database ended`);
      await knex.destroy();
      knex.client.releaseConnection(connection);
      logger.worker.info(`Released sql connection : on end`);
    });

    connection.on("error", async (err: any) => {
      logger.worker.error(err);
      knex.client.releaseConnection(connection);
      await knex.destroy();
      logger.worker.info(`Released sql connection: on error`);
    });
  } catch (error) {
    logger.worker.error(`Error in notification listener: ${error}`);
    throw error;
  }
};

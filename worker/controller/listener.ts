import { FastifyInstance } from "fastify";
import { connectToDatabase } from "../../core";
import { queue } from "../services/pQueue";
import { processTransaction } from "./processTransaction";

const beginTransactionProcessing = (server: FastifyInstance) => {
  return async () => {
    server.log.info(`--- processing Q request started at ${new Date()} ---`);
    await processTransaction(server);
    server.log.info(`--- processing Q request ended at ${new Date()} ---`);
  };
};

export const startNotificationListener = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    server.log.info(`Starting notification listener`);
    // Acquire a connection
    const knex = await connectToDatabase();
    const connection = await knex.client.acquireConnection();
    connection.query("LISTEN new_transaction_data");

    // Adding to Queue to Process Requests
    queue.add(beginTransactionProcessing(server));

    connection.on(
      "notification",
      async (msg: { channel: string; payload: string }) => {
        queue.add(beginTransactionProcessing(server));
      },
    );

    connection.on("end", async () => {
      server.log.info(`Connection database ended`);
      await knex.destroy();
      knex.client.releaseConnection(connection);
      server.log.info(`Released sql connection : on end`);
    });

    connection.on("error", async (err: any) => {
      server.log.error(err);
      knex.client.releaseConnection(connection);
      await knex.destroy();
      server.log.info(`Released sql connection: on error`);
    });
  } catch (error) {
    server.log.error(`Error in notification listener: ${error}`);
    throw error;
  }
};

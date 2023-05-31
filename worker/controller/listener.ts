import { FastifyInstance } from "fastify";
import { connectToDB } from "../../core";
import { processTransaction } from "./processTransaction";

export const startNotificationListener = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectToDB(server);
    server.log.info(`Starting notification listener`);
    // Acquire a connection
    const connection = await knex.client.acquireConnection();
    connection.query("LISTEN new_transaction_data");

    connection.on(
      "notification",
      async (msg: { channel: string; payload: string }) => {
        try {
          server.log.info(">>> new notification", msg.payload);
          await processTransaction(server);
        } catch (err) {
          server.log.error("failed to process notification", err);
        }
      },
    );

    connection.on("end", () => {
      server.log.info(`Worker Notification DB connection ended`);
    });

    connection.on("error", (err: any) => {
      console.error("Worker Notification DB error", err);
    });

    knex.client.releaseConnection(connection);
  } catch (error) {
    server.log.error(`Error in notification listener: ${error}`);
    throw error;
  }
};

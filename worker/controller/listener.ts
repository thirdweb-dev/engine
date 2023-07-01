import { FastifyInstance } from "fastify";
import { connectWithDatabase } from "../../core";
import { processTransaction } from "./processTransaction";
import { queue } from "../services/pQueue";

export const startNotificationListener = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectWithDatabase(server);
    server.log.info(`Starting notification listener`);
    // Acquire a connection
    const connection = await knex.client.acquireConnection();
    connection.query("LISTEN new_transaction_data");
    // Adding to Queue to Process Requests

    queue.add(async () => {
      server.log.info(`--- processing Q request started at ${new Date()} ---`);
      await processTransaction(server);
      server.log.info(`--- processing Q request ended at ${new Date()} ---`);
    });

    connection.on(
      "notification",
      async (msg: { channel: string; payload: string }) => {
        queue.add(async () => {
          server.log.info(
            `--- processing Q request started at ${new Date()} ---`,
          );
          await processTransaction(server);
          server.log.info(
            `--- processing Q request ended at ${new Date()} ---`,
          );
        });
      },
    );

    connection.on("end", () => {
      server.log.info(`Connection database ended`);
    });

    connection.on("error", (err: any) => {
      server.log.error(err);
    });

    knex.client.releaseConnection(connection);
  } catch (error) {
    server.log.error(`Error in notification listener: ${error}`);
    throw error;
  }
};

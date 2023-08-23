import { FastifyInstance } from "fastify";
import { connectWithDatabase } from "../../core";
import { queue } from "../services/pQueue";
import { processTransaction } from "./processTransaction";

export const startNotificationListener = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    server.log.info(`Starting notification listener`);
    // Acquire a connection
    const knex = await connectWithDatabase();
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

    connection.on("end", async () => {
      server.log.info(`Connection database ended`);
      await knex.destroy();
      knex.client.releaseConnection(connection);
      server.log.debug(`Released connection : on end`);
    });

    connection.on("error", async (err: any) => {
      server.log.error(err);
      knex.client.releaseConnection(connection);
      await knex.destroy();
      server.log.debug(`Released connection: on error`);
    });
  } catch (error) {
    server.log.error(`Error in notification listener: ${error}`);
    throw error;
  }
};

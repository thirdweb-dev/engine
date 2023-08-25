import { FastifyInstance } from "fastify";
import { connectWithDatabase } from "../../core";
import { findTxDetailsWithQueueId } from "../helpers";
import {
  formatSocketMessage,
  getStatusMessageAndConnectionStatus,
} from "../helpers/websocket";
import { subscriptionsData } from "../schemas/websocket";

export const startTxUpdatesNotificationListener = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectWithDatabase();
    server.log.info(`Starting update notification listener`);
    // Acquire a connection
    const connection = await knex.client.acquireConnection();
    connection.query("LISTEN updated_transaction_data");

    connection.on(
      "notification",
      async (msg: { channel: string; payload: string }) => {
        server.log.debug(
          `Received notification: ${msg.channel}, ${msg.payload}`,
        );
        const parsedPayload = JSON.parse(msg.payload);
        const index = subscriptionsData.findIndex(
          (sub) => sub.requestId === parsedPayload.identifier,
        );

        if (index == -1) {
          return;
        }

        const userSubscription = subscriptionsData[index];
        const returnData = await findTxDetailsWithQueueId(
          parsedPayload.identifier,
          server,
        );
        const { message, closeConnection } =
          await getStatusMessageAndConnectionStatus(returnData);
        userSubscription.socket.send(
          await formatSocketMessage(returnData, message),
        );
        closeConnection ? userSubscription.socket.close() : null;
      },
    );

    connection.on("end", async () => {
      server.log.info(`Connection database ended`);
      knex.client.releaseConnection(connection);
      await knex.destroy();
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

import { knex } from "../../db/client";
import { getTxById } from "../../db/transactions/getTxById";
import { subscriptionsData } from "../../server/schemas/websocket";
import {
  formatSocketMessage,
  getStatusMessageAndConnectionStatus,
} from "../../server/utils/websocket";
import { logger } from "../../utils/logger";

export const updateTxListener = async (): Promise<void> => {
  logger({
    service: "server",
    level: "info",
    message: `Listening for updated transactions`,
  });

  const connection = await knex.client.acquireConnection();
  connection.query(`LISTEN updated_transaction_data`);

  connection.on(
    "notification",
    async (msg: { channel: string; payload: string }) => {
      const parsedPayload = JSON.parse(msg.payload);

      logger({
        service: "server",
        level: "debug",
        message: `[updateTxListener] Received updated transaction data ${parsedPayload.id}.`,
      });

      // Send websocket message
      const index = subscriptionsData.findIndex(
        (sub) => sub.requestId === parsedPayload.id,
      );

      if (index == -1) {
        return;
      }

      const userSubscription = subscriptionsData[index];
      const returnData = await getTxById({
        queueId: parsedPayload.id,
      });

      const { message, closeConnection } =
        await getStatusMessageAndConnectionStatus(returnData);
      userSubscription.socket.send(
        await formatSocketMessage(returnData, message),
      );
      closeConnection ? userSubscription.socket.close() : null;
    },
  );

  connection.on("end", async () => {
    logger({
      service: "server",
      level: "info",
      message: `[updateTxListener] Connection database ended`,
    });

    knex.client.releaseConnection(connection);
    await knex.destroy();

    logger({
      service: "server",
      level: "info",
      message: `[updateTxListener] Released database connection on end`,
    });
  });

  connection.on("error", async (err: any) => {
    logger({
      service: "server",
      level: "error",
      message: `[updateTxListener] Database connection error`,
      error: err,
    });

    knex.client.releaseConnection(connection);
    await knex.destroy();

    logger({
      service: "worker",
      level: "info",
      message: `[updateTxListener] Released database connection on error`,
    });
  });
};

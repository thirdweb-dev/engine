import { knex } from "../../shared/db/client";
import { TransactionDB } from "../../shared/db/transactions/db";
import { logger } from "../../shared/utils/logger";
import { toTransactionSchema } from "../schemas/transaction";
import { subscriptionsData } from "../schemas/websocket";
import {
  formatSocketMessage,
  getStatusMessageAndConnectionStatus,
} from "../utils/websocket";

export const updateTxListener = async (): Promise<void> => {
  logger({
    service: "server",
    level: "info",
    message: "Listening for updated transactions",
  });

  const connection = await knex.client.acquireConnection();
  connection.query("LISTEN updated_transaction_data");

  connection.on(
    "notification",
    async (msg: { channel: string; payload: string }) => {
      const parsedPayload = JSON.parse(msg.payload);

      // Send websocket message
      const index = subscriptionsData.findIndex(
        (sub) => sub.requestId === parsedPayload.id,
      );

      if (index === -1) {
        return;
      }

      const userSubscription = subscriptionsData[index];
      const transaction = await TransactionDB.get(parsedPayload.id);
      const returnData = transaction ? toTransactionSchema(transaction) : null;

      logger({
        service: "server",
        level: "info",
        message: `[updateTxListener] Sending websocket update for queueId: ${parsedPayload.id}, status ${returnData?.status}.`,
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
      message: "[updateTxListener] Connection database ended",
    });

    knex.client.releaseConnection(connection);
    await knex.destroy();

    logger({
      service: "server",
      level: "info",
      message: "[updateTxListener] Released database connection on end",
    });
  });

  connection.on("error", async (err: any) => {
    logger({
      service: "server",
      level: "error",
      message: "[updateTxListener] Database connection error",
      error: err,
    });

    knex.client.releaseConnection(connection);
    await knex.destroy();

    logger({
      service: "worker",
      level: "info",
      message: "[updateTxListener] Released database connection on error",
    });
  });
};

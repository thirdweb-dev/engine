import {
  formatSocketMessage,
  getStatusMessageAndConnectionStatus,
} from "../../../server/helpers/websocket";
import { subscriptionsData } from "../../../server/schemas/websocket";
import { sendTxWebhook } from "../../../server/utilities/webhook";
import { knex } from "../../db/client";
import { getTxById } from "../../db/transactions/getTxById";
import { logger } from "../../utils/logger";

export const updateTxListener = async (): Promise<void> => {
  logger.worker.info(`Listening for updated transactions`);

  const connection = await knex.client.acquireConnection();
  connection.query(`LISTEN updated_transaction_data`);

  connection.on(
    "notification",
    async (msg: { channel: string; payload: string }) => {
      const parsedPayload = JSON.parse(msg.payload);

      // Send webhook
      await sendTxWebhook(parsedPayload);

      // Send websocket message
      const index = subscriptionsData.findIndex(
        (sub) => sub.requestId === parsedPayload.identifier,
      );

      if (index == -1) {
        return;
      }

      const userSubscription = subscriptionsData[index];
      const returnData = await getTxById({
        queueId: parsedPayload.identifier,
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
    logger.server.info(`Connection database ended`);
    knex.client.releaseConnection(connection);
    await knex.destroy();
    logger.server.info(`Released sql connection : on end`);
  });

  connection.on("error", async (err: any) => {
    logger.server.error(err);
    knex.client.releaseConnection(connection);
    await knex.destroy();
    logger.server.info(`Released sql connection: on error`);
  });
};

import { knex } from "../../src/db/client";
import { getTxById } from "../../src/db/transactions/getTxById";
import { env } from "../../src/utils/env";
import { logger } from "../../src/utils/logger";

export const startTxUpdatesNotificationListener = async (): Promise<void> => {
  try {
    // Connect to the DB
    logger.server.info(`Starting update notification listener`);
    // Acquire a connection
    const connection = await knex.client.acquireConnection();
    connection.query("LISTEN updated_transaction_data");

    connection.on(
      "notification",
      async (msg: { channel: string; payload: string }) => {
        const parsedPayload = JSON.parse(msg.payload);
        if (env.WEBHOOK_URL.length > 0) {
          const txData = await getTxById({ queueId: parsedPayload.id });
          const response = await fetch(env.WEBHOOK_URL, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(txData),
          });

          if (!response.ok) {
            logger.server.error(
              `Webhook error: ${response.status} ${response.statusText}`,
            );
          }
        } else {
          logger.server.debug(
            `Webhooks are disabled or no URL is provided. Skipping webhook update`,
          );
        }
        // const index = subscriptionsData.findIndex(
        //   (sub) => sub.requestId === parsedPayload.identifier,
        // );

        // if (index == -1) {
        //   return;
        // }

        // const userSubscription = subscriptionsData[index];
        // const returnData = await getTxById({
        //   queueId: parsedPayload.identifier,
        // });
        // const { message, closeConnection } =
        //   await getStatusMessageAndConnectionStatus(returnData);
        // userSubscription.socket.send(
        //   await formatSocketMessage(returnData, message),
        // );
        // closeConnection ? userSubscription.socket.close() : null;
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
  } catch (error) {
    logger.server.error(`Error in notification listener: ${error}`);
    throw error;
  }
};

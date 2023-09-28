import { connectToDatabase } from "../../core";
import { getTxById } from "../../src/db/transactions/getTxById";
import { env } from "../../src/utils/env";
import { logger } from "../../src/utils/logger";

export const startTxUpdatesNotificationListener = async (): Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectToDatabase();
    logger.server.info(`Starting update notification listener`);
    // Acquire a connection
    const connection = await knex.client.acquireConnection();
    connection.query("LISTEN updated_transaction_data");

    connection.on(
      "notification",
      async (msg: { channel: string; payload: string }) => {
        logger.server.debug(
          `Received notification: ${msg.channel}, ${msg.payload}`,
        );
        const parsedPayload = JSON.parse(msg.payload);
        if (env.WEBHOOKS_ENABLED && env.WEBHOOK_URL.length > 0) {
          const txData = await getTxById({ queueId: parsedPayload.id });
          const response = await fetch(env.WEBHOOK_URL!, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.THIRDWEB_API_SECRET_KEY}`,
            },
            body: JSON.stringify(txData),
          });

          logger.server.debug(
            `Webhook update sent to URL: ${env.WEBHOOK_URL}. Response: ${response.status}`,
          );
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

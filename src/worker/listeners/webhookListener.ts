import { knex } from "../../db/client";
import { webhookCache } from "../../utils/cache/getWebhook";
import { logger } from "../../utils/logger";

export const newWebhooksListener = async (): Promise<void> => {
  logger({
    service: "worker",
    level: "info",
    message: `Listening for new webhooks data`,
  });

  // TODO: This doesn't even need to be a listener
  const connection = await knex.client.acquireConnection();
  connection.query(`LISTEN new_webhook_data`);

  // Whenever we receive a new transaction, process it
  connection.on(
    "notification",
    async (msg: { channel: string; payload: string }) => {
      logger({
        service: "worker",
        level: "info",
        message: `Received new webhooks data`,
      });
      // Update Webhooks Data
      webhookCache.clear();
    },
  );

  connection.on("end", async () => {
    await knex.destroy();
    knex.client.releaseConnection(connection);

    logger({
      service: "worker",
      level: "info",
      message: `Released database connection on end`,
    });
  });

  connection.on("error", async (err: any) => {
    logger({
      service: "worker",
      level: "error",
      message: `Database connection error`,
      error: err,
    });

    await knex.destroy();
    knex.client.releaseConnection(connection);

    logger({
      service: "worker",
      level: "info",
      message: `Released database connection on error`,
      error: err,
    });
  });
};

export const updatedWebhooksListener = async (): Promise<void> => {
  logger({
    service: "worker",
    level: "info",
    message: `Listening for updated webhooks data`,
  });

  // TODO: This doesn't even need to be a listener
  const connection = await knex.client.acquireConnection();
  connection.query(`LISTEN updated_webhook_data`);

  // Whenever we receive a new transaction, process it
  connection.on(
    "notification",
    async (msg: { channel: string; payload: string }) => {
      // Update Configs Data
      logger({
        service: "worker",
        level: "info",
        message: `Received updated webhooks data`,
      });
      webhookCache.clear();
    },
  );

  connection.on("end", async () => {
    await knex.destroy();
    knex.client.releaseConnection(connection);

    logger({
      service: "worker",
      level: "info",
      message: `Released database connection on end`,
    });
  });

  connection.on("error", async (err: any) => {
    logger({
      service: "worker",
      level: "error",
      message: `Database connection error`,
      error: err,
    });

    await knex.destroy();
    knex.client.releaseConnection(connection);

    logger({
      service: "worker",
      level: "info",
      message: `Released database connection on error`,
      error: err,
    });
  });
};

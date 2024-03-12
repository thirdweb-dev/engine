import { Job, Worker } from "bullmq";
import { bullMQConnection } from "../../db/client";
import { RedisTxInput } from "../../db/transactions/queueTx";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { getWebhook } from "../../utils/cache/getWebhook";
import { logger } from "../../utils/logger";
import { sendWebhookRequest } from "../../utils/webhook";

// Worker processing logic
export const processWebhook = async () => {
  const myWorker = new Worker(
    "webhookQueue",
    async (job: Job) => {
      const rawRequest = job.data as RedisTxInput;
      logger({
        level: "info",
        message: `[processWebhook] Webhook job ${job.id} ${JSON.stringify(
          rawRequest,
        )}`,
        service: "worker",
      });
      const webhookConfigs = await Promise.all([
        ...((await getWebhook(WebhooksEventTypes.ALL_TX)) || []),
      ]);

      logger({
        level: "info",
        message: `[processWebhook] Webhook job ${job.id} ${JSON.stringify(
          webhookConfigs,
        )}`,
        service: "worker",
      });
      await Promise.all(
        webhookConfigs.map(async (webhookConfig) => {
          if (!webhookConfig.active) {
            logger({
              service: "worker",
              level: "info",
              message: "No webhook set or active, skipping webhook send",
            });

            return;
          }

          await sendWebhookRequest(
            webhookConfig,
            rawRequest as Record<string, any>,
          );
        }),
      );
    },
    bullMQConnection,
  );

  myWorker.on("completed", (job: Job) => {
    logger({
      level: "info",
      message: `[processWebhook] Webhook job ${job.id} has completed!`,
      service: "worker",
    });
  });

  myWorker.on(
    "failed",
    (job: Job<any, any, string> | undefined, err: Error) => {
      if (job) {
        logger({
          level: "error",
          message: `[processWebhook] Webhook job ${job.id} has failed with ${err.message}`,
          service: "worker",
        });
      } else {
        logger({
          level: "error",
          message: `[processWorker] Webhook job is undefined. Error: ${err.message}`,
          service: "worker",
        });
      }
    },
  );
};

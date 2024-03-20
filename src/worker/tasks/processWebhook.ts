import { Job, Worker } from "bullmq";
import { bullMQConnection, prisma } from "../../db/client";
import { cleanTxs } from "../../db/transactions/cleanTxs";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import { logger } from "../../utils/logger";
import { sendWebhookRequest } from "../../utils/webhook";

// Worker processing logic
export const processWebhook = async () => {
  const myWorker = new Worker(
    "webhookQueue",
    async (job: Job) => {
      logger({
        level: "info",
        message: `[processWebhook] Webhook job ${job.id} ${JSON.stringify(
          job.data,
        )}`,
        service: "worker",
      });
      const webhookConfigs = await getAllWebhooks();
      console.log("::Debug Log:: QueueId", job.data.id);

      const rawRequest = await prisma.transactions.findUnique({
        where: {
          id: job.data.id,
        },
      });

      if (rawRequest !== null && rawRequest !== undefined) {
        const cleanedTx = cleanTxs([rawRequest])[0];

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

            if (rawRequest !== null && rawRequest !== undefined) {
              await sendWebhookRequest(webhookConfig, cleanedTx);
            }
          }),
        );
      }
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

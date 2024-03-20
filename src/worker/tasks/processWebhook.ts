import { Job, Worker } from "bullmq";
import { bullMQConnection, prisma } from "../../db/client";
import { cleanTxs } from "../../db/transactions/cleanTxs";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import { logger } from "../../utils/logger";
import { sendWebhookRequest } from "../../utils/webhook";

// Worker processing logic
export const processWebhook = async () => {
  const webhookWorker = new Worker(
    "webhookQueue",
    async (job: Job) => {
      const webhookConfigs = await getAllWebhooks();

      const rawRequest = await prisma.transactions.findUnique({
        where: {
          id: job.data.id,
        },
      });

      if (rawRequest !== null && rawRequest !== undefined) {
        const cleanedTx = cleanTxs([rawRequest])[0];

        logger({
          level: "debug",
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

  webhookWorker.on("completed", (job: Job) => {
    logger({
      level: "debug",
      message: `[processWebhook] Webhook job ${job.id} has completed!`,
      service: "worker",
    });
  });

  webhookWorker.on(
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

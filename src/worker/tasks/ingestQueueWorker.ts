import { Job, Worker } from "bullmq";
import { bullMQConnection, prisma, webhookQueue } from "../../db/client";
import { cleanTxs } from "../../db/transactions/cleanTxs";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { WebhookData } from "../../utils/webhook";

// Worker processing logic
export const startIngestQueueWorker = async () => {
  const ingestRequestWorker = new Worker(
    "ingestRequestQueue",
    async (job: Job) => {
      const tx = job.data;
      logger({
        level: "debug",
        message: `Processing job ${job.id}`,
        service: "worker",
      });

      const insertedData = await prisma.transactions.create({
        data: {
          ...tx,
          fromAddress: tx.fromAddress?.toLowerCase(),
          toAddress: tx.toAddress?.toLowerCase(),
          target: tx.target?.toLowerCase(),
          signerAddress: tx.signerAddress?.toLowerCase(),
          accountAddress: tx.accountAddress?.toLowerCase(),
          queuedAt: new Date(),
        },
      });

      const sanitizedTxData = cleanTxs([insertedData]);
      const webhookQueueData: WebhookData = {
        data: sanitizedTxData[0],
        id: insertedData.id,
        status: TransactionStatusEnum.Queued,
      };

      webhookQueue.add("webhookQueue", webhookQueueData);
    },
    {
      concurrency: env.INGEST_WORKER_CONCURRENCY,
      connection: bullMQConnection,
    },
  );

  ingestRequestWorker.on("completed", (job: Job) => {
    logger({
      level: "debug",
      message: `[startIngestQueueWorker] Job ${job.id} has completed!`,
      service: "worker",
    });
  });

  ingestRequestWorker.on(
    "failed",
    (job: Job<any, any, string> | undefined, err: Error) => {
      if (job) {
        logger({
          level: "error",
          message: `[startIngestQueueWorker]  Job ${job.id} has failed with ${err.message}`,
          service: "worker",
        });
      } else {
        logger({
          level: "error",
          message: `[startIngestQueueWorker]  Job is undefined. Error: ${err.message}`,
          service: "worker",
        });
      }
    },
  );
};

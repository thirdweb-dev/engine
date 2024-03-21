import { Job, Worker } from "bullmq";
import { bullMQConnection, prisma, webhookQueue } from "../../db/client";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

// Worker processing logic
export const startIngestQueueWorker = async () => {
  const ingestRequestWorker = new Worker(
    "ingestRequestQueue",
    async (job: Job) => {
      const tx = job.data;
      logger({
        level: "info",
        message: `Processing job ${job.id} ${JSON.stringify(tx)}`,
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

      webhookQueue.add("webhookQueue", insertedData, { delay: 1000 });
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

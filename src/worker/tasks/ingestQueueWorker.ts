import { Job, Worker } from "bullmq";
import { bullMQConnection, prisma, webhookQueue } from "../../db/client";
import { RedisTxInput } from "../../db/transactions/queueTx";
import { logger } from "../../utils/logger";

// Worker processing logic
export const startIngestQueueWorker = async () => {
  const myWorker = new Worker(
    "ingestRequestQueue",
    async (job: Job) => {
      const rawRequest = job.data as RedisTxInput;
      logger({
        level: "info",
        message: `Processing job ${job.id} ${JSON.stringify(rawRequest)}`,
        service: "worker",
      });
      const tx = job.data;

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
    bullMQConnection,
  );

  myWorker.on("completed", (job: Job) => {
    logger({
      level: "info",
      message: `[startIngestQueueWorker] Job ${job.id} has completed!`,
      service: "worker",
    });
  });

  myWorker.on(
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

import { Transactions } from "@prisma/client";
import { Job, Worker } from "bullmq";
import {
  bullMQConnection,
  getRedisClient,
  prisma,
  webhookQueue,
} from "../../db/client";
import { cleanTxs } from "../../db/transactions/cleanTxs";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import {
  getIdempotencyCacheKey,
  getQueueIdCacheKey,
} from "../../utils/redisKeys";
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

      const idempotencyKey = tx.idempotencyKey;

      let txRow: Transactions;
      if (idempotencyKey) {
        // Upsert the tx (insert if not exists).
        txRow = await prisma.transactions.upsert({
          where: { idempotencyKey },
          create: {
            ...tx,
            idempotencyKey,
          },
          update: {},
        });
      } else {
        // Insert the tx.
        txRow = await prisma.transactions.create({
          data: {
            ...tx,
            fromAddress: tx.fromAddress?.toLowerCase(),
            toAddress: tx.toAddress?.toLowerCase(),
            target: tx.target?.toLowerCase(),
            signerAddress: tx.signerAddress?.toLowerCase(),
            accountAddress: tx.accountAddress?.toLowerCase(),
            queuedAt: new Date(),
            idempotencyKey: tx.id,
          },
        });
      }

      const sanitizedTxData = cleanTxs([txRow]);
      const webhookQueueData: WebhookData = {
        data: sanitizedTxData[0],
        id: txRow.id,
        status: TransactionStatusEnum.Queued,
      };

      const idempotencyCacheKey = getIdempotencyCacheKey(
        idempotencyKey || tx.id,
      );
      const queueIdCacheKey = getQueueIdCacheKey(tx.id);
      const redisClient = await getRedisClient();

      console.log("::Debug Log:: queueIdCacheKey:", queueIdCacheKey);
      console.log("::Debug Log:: idempotencyCacheKey:", idempotencyCacheKey);

      await redisClient.hmset(queueIdCacheKey, txRow);
      await redisClient.hmset(idempotencyCacheKey, txRow);

      webhookQueue.add("webhookQueue", webhookQueueData, {
        removeOnComplete: true,
      });
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

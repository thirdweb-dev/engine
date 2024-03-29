import { Job, Processor, Worker } from "bullmq";
import { prisma } from "../../db/client";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { IngestQueueData } from "../queues/queues";
import { logWorkerEvents } from "../queues/workers";

const handleIngest: Processor<any, void, string> = async (
  job: Job<IngestQueueData>,
) => {
  const { tx } = job.data;

  if (tx.idempotencyKey) {
    // Upsert the tx (insert if not exists).
    await prisma.transactions.upsert({
      where: {
        idempotencyKey: tx.idempotencyKey,
      },
      create: tx,
      update: {},
    });
  } else {
    // Insert the tx.
    await prisma.transactions.create({
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
  }
};

const ingestWorker = new Worker("ingest", handleIngest, {
  concurrency: env.INGEST_WORKER_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(ingestWorker);

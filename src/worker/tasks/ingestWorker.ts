import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { prisma } from "../../db/client";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { IngestJob } from "../queues/queues";
import { logWorkerEvents } from "../queues/workers";

const handleIngest: Processor<any, void, string> = async (job: Job) => {
  const { tx } = superjson.parse<IngestJob>(job.data);

  // Insert if the idempotency key does not exist. Else no-op.
  await prisma.transactions.upsert({
    where: {
      idempotencyKey: tx.idempotencyKey,
    },
    create: tx,
    update: {},
  });
};

const ingestWorker = new Worker("ingest", handleIngest, {
  concurrency: env.INGEST_WORKER_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(ingestWorker);

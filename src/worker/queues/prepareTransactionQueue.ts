import { Queue } from "bullmq";
import superjson from "superjson";
import { QueuedTransaction } from "../../server/utils/transaction";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const PREPARE_TRANSACTION_QUEUE_NAME = "transactions-1-prepare";

// Queue
const _queue = new Queue<string>(PREPARE_TRANSACTION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

export type PrepareTransactionData = {
  queuedTransaction: QueuedTransaction;
};

export const enqueuePrepareTransaction = async (
  data: PrepareTransactionData,
) => {
  const serialized = superjson.stringify(data);
  await _queue.add(data.queuedTransaction.queueId, serialized, {
    // Don't enqueue more than one job per `idempotencyKey`.
    // This key is intended to prevent duplicate sends.
    jobId: data.queuedTransaction.idempotencyKey,
  });
};

import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { QueuedTransaction } from "../../utils/transaction/types";
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
  const jobId = _jobId(data.queuedTransaction);
  await _queue.add(data.queuedTransaction.queueId, serialized, { jobId });
};

export const removePrepareTransaction = async (
  queuedTransaction: QueuedTransaction,
) => {
  const jobId = _jobId(queuedTransaction);
  await _queue.remove(jobId);
};

// Don't enqueue more than one job per `idempotencyKey`.
// This key is intended to prevent duplicate sends.
const _jobId = (queuedTransaction: QueuedTransaction) =>
  queuedTransaction.idempotencyKey;

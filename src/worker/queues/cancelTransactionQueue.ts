import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const CANCEL_TRANSACTION_QUEUE_NAME = "transactions-3-cancel";

// Queue
const _queue = new Queue<string>(CANCEL_TRANSACTION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

export type CancelTransactionData = {
  queueId: string;
};

export const enqueueCancelTransaction = async (data: CancelTransactionData) => {
  const serialized = superjson.stringify(data);
  await _queue.add(data.queueId, serialized, {
    // No jobId. The same job may be enqueued to cancel different transaction hashes.
  });
};

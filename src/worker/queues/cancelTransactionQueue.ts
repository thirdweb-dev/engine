import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { SentTransaction } from "../../utils/transaction/types";
import { defaultJobOptions } from "./queues";

export const CANCEL_TRANSACTION_QUEUE_NAME = "transactions-4-cancel";

// Queue
const _queue = new Queue<string>(CANCEL_TRANSACTION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

export type CancelTransactionData = {
  sentTransaction: SentTransaction;
};

export const enqueueCancelTransaction = async (data: CancelTransactionData) => {
  const serialized = superjson.stringify(data);
  await _queue.add(data.sentTransaction.queueId, serialized, {
    // No jobId. The same job may be enqueued to cancel different transaction hashes.
  });
};

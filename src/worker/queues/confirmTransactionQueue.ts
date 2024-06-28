import { Queue } from "bullmq";
import superjson from "superjson";
import { SentTransaction } from "../../server/utils/transaction";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const CONFIRM_TRANSACTION_QUEUE_NAME = "transactions-3-confirm";

// Queue
const _queue = new Queue<string>(CONFIRM_TRANSACTION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    // Delay confirming the tx by 500ms.
    delay: 500,
    // Check in 5s, 10s, 20s, 40s, 80s, 160s, 320s, 640s, 1280s, 2560s (~45 minutes)
    attempts: 10,
    backoff: { type: "exponential", delay: 5_000 },
  },
});

export type ConfirmTransactionData = {
  sentTransaction: SentTransaction;
};

export const enqueueConfirmTransaction = async (
  data: ConfirmTransactionData,
) => {
  const serialized = superjson.stringify(data);
  await _queue.add(data.sentTransaction.queueId, serialized, {
    // Don't enqueue more than one job per `transactionHash`.
    // An existing job should continue checking the same hash.
    jobId: data.sentTransaction.transactionHash,
  });
};

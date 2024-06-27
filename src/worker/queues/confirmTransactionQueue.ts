import { Queue } from "bullmq";
import superjson from "superjson";
import { Hex } from "viem";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";
import { PreparedTransaction } from "./sendTransactionQueue";

export const CONFIRM_TRANSACTION_QUEUE_NAME = "confirm-transaction";

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

// SentTransaction is a transaction that is submitted to RPC successfully.
export type SentTransaction = PreparedTransaction & {
  sentAt: Date;
  sentAtBlock: bigint;
  transactionHash: Hex;
};

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

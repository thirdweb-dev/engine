import { Queue } from "bullmq";
import superjson from "superjson";
import { Hex } from "viem";
import { redis } from "../../utils/redis/redis";
import { QueuedTransaction } from "./prepareTransactionQueue";
import { defaultJobOptions } from "./queues";

export const SEND_TRANSACTION_QUEUE_NAME = "send-transaction";

// Queue
const _queue = new Queue<string>(SEND_TRANSACTION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

// PreparedTransaction is a transaction that has been simulated
// and has some onchain details set.
export type PreparedTransaction = QueuedTransaction & {
  nonce: number;
  data: Hex;
};

export type SendTransactionData = {
  preparedTransaction: PreparedTransaction;
  isRetry: boolean;
};

export const enqueueSendTransaction = async (data: SendTransactionData) => {
  const serialized = superjson.stringify(data);
  await _queue.add(data.preparedTransaction.queueId, serialized, {
    // No jobId. The same job may be enqueued for retries.
  });
};

import { Queue } from "bullmq";
import superjson from "superjson";
import { PreparedTransaction } from "../../server/utils/transaction";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const SEND_TRANSACTION_QUEUE_NAME = "transactions-2-send";

// Queue
const _queue = new Queue<string>(SEND_TRANSACTION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

export type SendTransactionData = {
  preparedTransaction: PreparedTransaction;
};

export const enqueueSendTransaction = async (data: SendTransactionData) => {
  const serialized = superjson.stringify(data);
  await _queue.add(data.preparedTransaction.queueId, serialized, {
    // Allow re-enqueing the same job if explicitly resubmitting.
    jobId: `${data.preparedTransaction.idempotencyKey}:${data.preparedTransaction.retryCount}`,
  });
};

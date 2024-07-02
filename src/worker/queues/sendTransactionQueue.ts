import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { PreparedTransaction } from "../../utils/transaction/types";
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
  const jobId = _jobId(data.preparedTransaction);
  await _queue.add(data.preparedTransaction.queueId, serialized, { jobId });
};

export const removeSendTransaction = async (
  preparedTransaction: PreparedTransaction,
) => {
  const jobId = _jobId(preparedTransaction);
  await _queue.remove(jobId);
};

// Allow re-enqueing the same job if explicitly resubmitting.
const _jobId = (preparedTransaction: PreparedTransaction) =>
  `${preparedTransaction.idempotencyKey}:${preparedTransaction.retryCount}`;

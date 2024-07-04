import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const SEND_TRANSACTION_QUEUE_NAME = "transactions-1-send";

// Queue
const _queue = new Queue<string>(SEND_TRANSACTION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

export type SendTransactionData = {
  queueId: string;
  retryCount: number;
};

export const enqueueSendTransaction = async (data: SendTransactionData) => {
  const serialized = superjson.stringify(data);
  await _queue.add(_jobId(data), serialized, { jobId: _jobId(data) });
};

export const removeSendTransaction = async (data: SendTransactionData) => {
  try {
    await _queue.remove(_jobId(data));
  } catch (e) {
    // Job is currently running.
  }
};

// Allow enqueing the same queueId for multiple retries.
const _jobId = (data: SendTransactionData) =>
  `${data.queueId}:${data.retryCount}`;

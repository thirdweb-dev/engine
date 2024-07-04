import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const MINE_TRANSACTION_QUEUE_NAME = "transactions-2-mine";

// Queue
const _queue = new Queue<string>(MINE_TRANSACTION_QUEUE_NAME, {
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

export type MineTransactionData = {
  queueId: string;
};

export const enqueueMineTransaction = async (data: MineTransactionData) => {
  const serialized = superjson.stringify(data);
  await _queue.add(_jobId(data), serialized, { jobId: _jobId(data) });
};

// There must be a worker to poll the result for every transaction hash,
// even for the same queueId. This handles if any retried transactions succeed.
const _jobId = (data: MineTransactionData) => data.queueId;

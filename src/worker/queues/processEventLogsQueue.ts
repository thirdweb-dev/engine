import { Queue } from "bullmq";
import SuperJSON from "superjson";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const PROCESS_EVENT_LOGS_QUEUE_NAME = "process-event-logs";

// Queue
const _queue = redis
  ? new Queue<string>(PROCESS_EVENT_LOGS_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions,
    })
  : null;

export type EnqueueEventLogsData = {
  chainId: number;
  addresses: string[];
  fromBlock: number; // inclusive
  toBlock: number; // inclusive
};

export const enqueueJobs = async (data: EnqueueEventLogsData) => {
  if (!_queue) return;

  const serialized = SuperJSON.stringify(data);
  await _queue.add(
    // e.g. 8453:14423125-14423685
    `${data.chainId}:${data.fromBlock}-${data.toBlock}`,
    serialized,
  );
};

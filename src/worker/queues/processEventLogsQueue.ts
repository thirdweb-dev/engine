import { Queue } from "bullmq";
import SuperJSON from "superjson";
import { getConfig } from "../../utils/cache/getConfig";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const PROCESS_EVENT_LOGS_QUEUE_NAME = "process-event-logs";

// Queue
const _queue = redis
  ? new Queue<string>(PROCESS_EVENT_LOGS_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 0,
      },
    })
  : null;

export type EnqueueProcessEventLogsData = {
  chainId: number;
  contractAddresses: string[];
  fromBlock: number; // inclusive
  toBlock: number; // inclusive
};

export const enqueueProcessEventLogs = async (
  data: EnqueueProcessEventLogsData,
) => {
  if (!_queue) return;

  const serialized = SuperJSON.stringify(data);
  // e.g. 8453:14423125-14423685
  const jobName = `${data.chainId}:${data.fromBlock}-${data.toBlock}`;
  const { contractSubscriptionsRetryDelaySeconds } = await getConfig();
  const retryDelays = contractSubscriptionsRetryDelaySeconds.split(",");

  // Enqueue one job immediately and any delayed jobs.
  await _queue.add(jobName, serialized);
  for (let i = 0; i < retryDelays.length; i++) {
    const delay = parseInt(retryDelays[i]) * 1000;
    const attempts = i === retryDelays.length - 1 ? 10 : 0;

    await _queue.add(jobName, serialized, {
      delay,
      attempts,
      backoff: { type: "exponential", delay: 30_000 },
    });
  }
};

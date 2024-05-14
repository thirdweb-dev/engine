import { Queue } from "bullmq";
import SuperJSON from "superjson";
import { getConfig } from "../../utils/cache/getConfig";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const PROCESS_TRANSACTION_RECEIPTS_QUEUE_NAME =
  "process-transaction-receipts";

// Queue
const _queue = redis
  ? new Queue<string>(PROCESS_TRANSACTION_RECEIPTS_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 0,
      },
    })
  : null;

export type EnqueueProcessTransactionReceiptsData = {
  chainId: number;
  contractAddresses: string[];
  fromBlock: number; // inclusive
  toBlock: number; // inclusive
};

export const enqueueProcessTransactionReceipts = async (
  data: EnqueueProcessTransactionReceiptsData,
) => {
  if (!_queue) return;

  const serialized = SuperJSON.stringify(data);
  // e.g. 8453:14423125-14423685
  const jobName = `${data.chainId}:${data.fromBlock}-${data.toBlock}`;
  const { contractSubscriptionsRetryDelaySeconds } = await getConfig();
  const retryDelays = contractSubscriptionsRetryDelaySeconds.split(",");

  // Enqueue one job immediately and any delayed jobs.
  await _queue.add(jobName, serialized);
  for (const retryDelay of retryDelays) {
    await _queue.add(jobName, serialized, {
      delay: parseInt(retryDelay) * 1000,
    });
  }
};

import { Queue } from "bullmq";
import superjson from "superjson";
import type { Address } from "thirdweb";
import { getConfig } from "../../shared/utils/cache/get-config.js";
import { redis } from "../../shared/utils/redis/redis.js";
import { defaultJobOptions } from "./queues.js";

// Each job handles a block range for a given chain, filtered by addresses + events.
export type EnqueueProcessTransactionReceiptsData = {
  chainId: number;
  filters: {
    address: Address;
    functions: string[];
  }[];
  fromBlock: number; // inclusive
  toBlock: number; // inclusive
};

export class ProcessTransactionReceiptsQueue {
  static q = new Queue<string>("process-transaction-receipts", {
    connection: redis,
    defaultJobOptions,
  });

  static add = async (data: EnqueueProcessTransactionReceiptsData) => {
    const serialized = superjson.stringify(data);
    // e.g. 8453:14423125-14423685
    const jobName = `${data.chainId}:${data.fromBlock}-${data.toBlock}`;
    const { contractSubscriptionsRequeryDelaySeconds } = await getConfig();
    const requeryDelays = contractSubscriptionsRequeryDelaySeconds.split(",");

    // Enqueue one job immediately and any delayed jobs.
    await this.q.add(jobName, serialized);

    // The last attempt should attempt repeatedly to handle extended RPC issues.
    // This backoff attempts at intervals:
    // 30s, 1m, 2m, 4m, 8m, 16m, 32m, ~1h, ~2h, ~4h
    for (const [i, delay] of requeryDelays.entries()) {
      const isLastAttempt = i === requeryDelays.length - 1;
      await this.q.add(jobName, serialized, {
        delay: Number.parseInt(delay) * 1000,
        attempts: isLastAttempt ? 10 : 0,
        backoff: { type: "exponential", delay: 30_000 },
      });
    }
  };
}

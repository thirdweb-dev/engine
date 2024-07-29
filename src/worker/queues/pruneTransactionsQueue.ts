import { Queue } from "bullmq";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const PRUNE_TRANSACTIONS_QUEUE_NAME = "prune-transactions";

const _queue = new Queue<string>(PRUNE_TRANSACTIONS_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

_queue.setGlobalConcurrency(1);
_queue.add("hourly-cron", "", {
  repeat: { pattern: "*/10 * * * *" },
  // Use a constant jobId to not insert multiple repeatable jobs.
  jobId: "prune-transactions-cron",
});

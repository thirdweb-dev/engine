import { Queue } from "bullmq";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const PURGE_TRANSACTIONS_QUEUE_NAME = "purge-transactions";

const _queue = new Queue<string>(PURGE_TRANSACTIONS_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

_queue.add("hourly-cron", "", {
  repeat: { pattern: "*/10 * * * *" },
  // Use a constant jobId to not insert multiple repeatable jobs.
  jobId: "billing-reporter-hourly-cron",
});

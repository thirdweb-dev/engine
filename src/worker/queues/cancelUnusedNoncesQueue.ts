import { Queue } from "bullmq";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const CANCEL_UNUSED_NONCES_QUEUE_NAME = "cancel-unused-nonces";

const _queue = new Queue<string>(CANCEL_UNUSED_NONCES_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions,
});

_queue.setGlobalConcurrency(1);
_queue.add("hourly-cron", "", {
  repeat: { pattern: "* * * * *" },
  // Use a constant jobId to not insert multiple repeatable jobs.
  jobId: "billing-reporter-hourly-cron",
});

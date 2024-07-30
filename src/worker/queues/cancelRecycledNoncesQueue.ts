import { Queue } from "bullmq";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

const CANCEL_RECYCLED_NONCES_QUEUE_NAME = "cancel-recycled-nonces";

export const cancelRecycledNoncesQueue = new Queue<string>(
  CANCEL_RECYCLED_NONCES_QUEUE_NAME,
  {
    connection: redis,
    defaultJobOptions,
  },
);

cancelRecycledNoncesQueue.setGlobalConcurrency(1);
cancelRecycledNoncesQueue.add("hourly-cron", "", {
  repeat: { pattern: "* * * * *" },
  // Use a constant jobId to not insert multiple repeatable jobs.
  jobId: "cancel-recycled-nonces-cron",
});

import { Queue } from "bullmq";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class PruneTransactionsQueue {
  static q = new Queue<string>("prune-transactions", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    if (env.ENGINE_MODE === "server_only") {
      return;
    }

    PruneTransactionsQueue.q.setGlobalConcurrency(1);
    PruneTransactionsQueue.q.add("cron", "", {
      repeat: { pattern: "*/10 * * * *" },
      jobId: "cron",
    });
  }
}

import { Queue } from "bullmq";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class PruneTransactionsQueue {
  private static name = "prune-transactions";

  static q = new Queue<string>(this.name, {
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

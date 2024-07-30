import { Queue } from "bullmq";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class CancelRecycledNoncesQueue {
  private static name = "cancel-recycled-nonces";

  static q = new Queue<string>(this.name, {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    if (env.ENGINE_MODE === "server_only") {
      return;
    }

    CancelRecycledNoncesQueue.q.setGlobalConcurrency(1);
    CancelRecycledNoncesQueue.q.add("cron", "", {
      repeat: { pattern: "* * * * *" },
      jobId: "cron",
    });
  }
}

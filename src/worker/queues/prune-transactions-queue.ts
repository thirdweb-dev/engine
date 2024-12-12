import { Queue } from "bullmq";
import { redis } from "../../shared/utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class PruneTransactionsQueue {
  static q = new Queue<string>("prune-transactions", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    PruneTransactionsQueue.q.setGlobalConcurrency(1);
  }
}

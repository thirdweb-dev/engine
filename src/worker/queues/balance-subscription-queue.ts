import { Queue } from "bullmq";
import { redis } from "../../shared/utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class BalanceSubscriptionQueue {
  static q = new Queue<string>("balance-subscription", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    BalanceSubscriptionQueue.q.setGlobalConcurrency(1);
  }
} 
import { Queue } from "bullmq";
import { redis } from "../../shared/utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class WalletSubscriptionQueue {
  static q = new Queue<string>("wallet-subscription", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    WalletSubscriptionQueue.q.setGlobalConcurrency(1);
  }
} 
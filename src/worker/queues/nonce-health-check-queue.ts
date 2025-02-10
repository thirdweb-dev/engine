import { Queue } from "bullmq";
import { redis } from "../../shared/utils/redis/redis.js";
import { defaultJobOptions } from "./queues.js";

export class NonceHealthCheckQueue {
  static q = new Queue<string>("nonceHealthCheck", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    NonceHealthCheckQueue.q.setGlobalConcurrency(1);
  }
}

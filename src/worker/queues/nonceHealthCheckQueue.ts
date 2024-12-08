import { Queue } from "bullmq";
import { redis } from "../../shared/utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class NonceHealthCheckQueue {
  static q = new Queue<string>("nonceHealthCheck", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    NonceHealthCheckQueue.q.setGlobalConcurrency(1);
  }
}

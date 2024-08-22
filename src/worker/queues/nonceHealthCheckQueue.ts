import { Queue } from "bullmq";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class NonceHealthCheckQueue {
  static q = new Queue<string>("log", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    NonceHealthCheckQueue.q.setGlobalConcurrency(1);
  }
}

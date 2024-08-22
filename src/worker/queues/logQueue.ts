import { Queue } from "bullmq";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class LogQueue {
  static q = new Queue<string>("log", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    LogQueue.q.setGlobalConcurrency(1);
  }
}

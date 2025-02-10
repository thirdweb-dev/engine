import { Queue } from "bullmq";
import { redis } from "../../shared/utils/redis/redis.js";
import { defaultJobOptions } from "./queues.js";

export class CancelRecycledNoncesQueue {
  static q = new Queue<string>("cancel-recycled-nonces", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    CancelRecycledNoncesQueue.q.setGlobalConcurrency(1);
  }
}

import { Queue } from "bullmq";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class CancelRecycledNoncesQueue {
  static q = new Queue<string>("cancel-recycled-nonces", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    CancelRecycledNoncesQueue.q.setGlobalConcurrency(1);
  }
}

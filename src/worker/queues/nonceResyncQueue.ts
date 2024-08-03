import { Queue } from "bullmq";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class NonceResyncQueue {
  static q = new Queue<string>("nonce-resync-cron", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    NonceResyncQueue.q.setGlobalConcurrency(1);

    // The cron job is defined in `initMigratePostgresTransactionsWorker`
    // because it requires an async call to query configuration.
  }
}

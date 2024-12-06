import { Queue } from "bullmq";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export class MigratePostgresTransactionsQueue {
  static q = new Queue<string>("migrate-postgres-transactions", {
    connection: redis,
    defaultJobOptions,
  });

  constructor() {
    MigratePostgresTransactionsQueue.q.setGlobalConcurrency(1);

    // The cron job is defined in `initMigratePostgresTransactionsWorker`
    // because it requires an async call to query configuration.
  }
}

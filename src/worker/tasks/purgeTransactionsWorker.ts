import { Job, Processor, Worker } from "bullmq";
import { TransactionDB } from "../../db/transactions/db";
import { redis } from "../../utils/redis/redis";
import { PURGE_TRANSACTIONS_QUEUE_NAME } from "../queues/purgeTransactionsQueue";
import { logWorkerEvents } from "../queues/queues";

const COMPLETED_TRANSACTIONS_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  await TransactionDB.purgeTransactions({
    // Purge if older than COMPLETED_TRANSACTIONS_MAX_AGE_SECONDS.
    to: new Date(Date.now() - COMPLETED_TRANSACTIONS_MAX_AGE_MS * 1000),
  });
};

// Worker
const _worker = new Worker(PURGE_TRANSACTIONS_QUEUE_NAME, handler, {
  concurrency: 1,
  connection: redis,
});
logWorkerEvents(_worker);

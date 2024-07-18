import { Job, Processor, Worker } from "bullmq";
import { TransactionDB } from "../../db/transactions/db";
import { redis } from "../../utils/redis/redis";
import { PURGE_TRANSACTIONS_QUEUE_NAME } from "../queues/purgeTransactionsQueue";
import { logWorkerEvents } from "../queues/queues";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const purgeBeforeDate =
    Date.now() - TransactionDB.COMPLETED_TRANSACTIONS_MAX_AGE_SECONDS * 1000;

  await TransactionDB.purgeTransactions({
    to: new Date(purgeBeforeDate),
  });
};

// Worker
const _worker = new Worker(PURGE_TRANSACTIONS_QUEUE_NAME, handler, {
  concurrency: 1,
  connection: redis,
});
logWorkerEvents(_worker);

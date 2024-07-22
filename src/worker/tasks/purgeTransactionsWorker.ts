import { Job, Processor, Worker } from "bullmq";
import { TransactionDB } from "../../db/transactions/db";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { PURGE_TRANSACTIONS_QUEUE_NAME } from "../queues/purgeTransactionsQueue";
import { logWorkerEvents } from "../queues/queues";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  // Purge transactions up to `PRUNE_TRANSACTIONS` days ago.
  const to = new Date();
  to.setDate(to.getDate() - env.PRUNE_TRANSACTIONS);

  await TransactionDB.purgeTransactions({ to });
};

// Worker
const _worker = new Worker(PURGE_TRANSACTIONS_QUEUE_NAME, handler, {
  concurrency: 1,
  connection: redis,
});
logWorkerEvents(_worker);

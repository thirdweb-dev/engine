import { Job, Processor, Worker } from "bullmq";
import { TransactionDB } from "../../db/transactions/db";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { PRUNE_TRANSACTIONS_QUEUE_NAME } from "../queues/pruneTransactionsQueue";
import { logWorkerExceptions } from "../queues/queues";

const handler: Processor<any, void, string> = async (_: Job<string>) => {
  // Purge transactions up to `PRUNE_TRANSACTIONS` days ago.
  const to = new Date();
  to.setDate(to.getDate() - env.PRUNE_TRANSACTIONS);

  await TransactionDB.pruneTransactions({ to });
};

// Worker
const _worker = new Worker(PRUNE_TRANSACTIONS_QUEUE_NAME, handler, {
  concurrency: 1,
  connection: redis,
});
logWorkerExceptions(_worker);

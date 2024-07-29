import { Job, Processor, Worker } from "bullmq";
import { TransactionDB } from "../../db/transactions/db";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { PRUNE_TRANSACTIONS_QUEUE_NAME } from "../queues/pruneTransactionsQueue";
import { logWorkerExceptions } from "../queues/queues";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  // Purge transactions up to `PRUNE_TRANSACTIONS` days ago.
  const to = new Date();
  to.setDate(to.getDate() - env.PRUNE_TRANSACTIONS);
  await TransactionDB.pruneTransactionLists({ to });
  job.log(`Pruned transaction lists to ${to.toLocaleString()}.`);

  // Prune transactions DB to the most recent `PRUNE_TRANSACTIONS_COUNT`.
  const numPruned = await TransactionDB.pruneTransactionDetails(
    env.PRUNE_TRANSACTIONS_KEEP_COUNT,
  );
  job.log(`Pruned ${numPruned} transaction details.`);
};

// Worker
const _worker = new Worker(PRUNE_TRANSACTIONS_QUEUE_NAME, handler, {
  concurrency: 1,
  connection: redis,
});
logWorkerExceptions(_worker);

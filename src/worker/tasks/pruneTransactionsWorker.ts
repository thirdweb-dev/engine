import { Job, Processor, Worker } from "bullmq";
import { TransactionDB } from "../../db/transactions/db";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { PruneTransactionsQueue } from "../queues/pruneTransactionsQueue";
import { logWorkerExceptions } from "../queues/queues";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const numPruned = await TransactionDB.pruneTransactionDetailsAndLists(
    env.TRANSACTION_HISTORY_COUNT,
  );
  job.log(`Pruned ${numPruned} transaction details.`);
};

// Must be explicitly called for the worker to run on this host.
export const initPruneTransactionsWorker = () => {
  const _worker = new Worker(PruneTransactionsQueue.q.name, handler, {
    concurrency: 1,
    connection: redis,
  });
  logWorkerExceptions(_worker);
};

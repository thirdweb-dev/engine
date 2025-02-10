import { Worker, type Job, type Processor } from "bullmq";
import { TransactionDB } from "../../shared/db/transactions/db.js";
import { pruneNonceMaps } from "../../shared/db/wallets/nonce-map.js";
import { env } from "../../shared/utils/env.js";
import { redis } from "../../shared/utils/redis/redis.js";
import { PruneTransactionsQueue } from "../queues/prune-transactions-queue.js";
import { logWorkerExceptions } from "../queues/queues.js";

const handler: Processor<string, void, string> = async (job: Job<string>) => {
  const numTransactionsDeleted =
    await TransactionDB.pruneTransactionDetailsAndLists(
      env.TRANSACTION_HISTORY_COUNT,
    );
  job.log(`Pruned ${numTransactionsDeleted} transaction details.`);

  const numNonceMapsDeleted = await pruneNonceMaps();
  job.log(`Pruned ${numNonceMapsDeleted} nonce maps.`);
};

// Must be explicitly called for the worker to run on this host.
export const initPruneTransactionsWorker = () => {
  PruneTransactionsQueue.q.add("cron", "", {
    repeat: { pattern: "*/10 * * * *" },
    jobId: "prune-transactions-cron",
  });

  const _worker = new Worker(PruneTransactionsQueue.q.name, handler, {
    concurrency: 1,
    connection: redis,
  });
  logWorkerExceptions(_worker);
};

import { Job, Processor, Worker } from "bullmq";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { PURGE_TRANSACTIONS_QUEUE_NAME } from "../queues/purgeTransactionsQueue";
import { logWorkerEvents } from "../queues/queues";

const handler: Processor<any, void, string> = async (job: Job<string>) => {};

// Worker
const _worker = new Worker(PURGE_TRANSACTIONS_QUEUE_NAME, handler, {
  concurrency: env.CANCEL_TRANSACTION_QUEUE_CONCURRENCY,
  connection: redis,
});
logWorkerEvents(_worker);

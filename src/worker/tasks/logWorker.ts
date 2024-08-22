import { Job, Processor, Worker } from "bullmq";
import { getNonceDetails } from "../../server/routes/admin/nonces";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { CancelRecycledNoncesQueue } from "../queues/cancelRecycledNoncesQueue";
import { LogQueue } from "../queues/logQueue";
import { logWorkerExceptions } from "../queues/queues";
import { SendTransactionQueue } from "../queues/sendTransactionQueue";

// Setup log cron job to run every minute
export const initLogWorker = () => {
  CancelRecycledNoncesQueue.q.add("cron", "", {
    repeat: { pattern: "* * * * *" },
    jobId: "log-cron",
  });

  const _worker = new Worker(LogQueue.q.name, handler, {
    connection: redis,
    concurrency: 1,
  });
  logWorkerExceptions(_worker);
};

/**
 * Log queue data and all nonce data.
 */
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  await Promise.all([logNonceDetails(), logQueueData()]);
};

const logNonceDetails = async () => {
  const nonceDetails = await getNonceDetails();

  for (const nonceDetail of nonceDetails) {
    const message = `[NONCES] ${nonceDetail.walletAddress}:${nonceDetail.chainId} lastUsedNonce:${nonceDetail.lastUsedNonce} recycledNoncesLength:${nonceDetail.recycledNonces.length} sentNoncesLength:${nonceDetail.sentNonces.length}`;
    logger({ service: "worker", level: "info", message });
  }
};

const logQueueData = async () => {
  const queueData = await SendTransactionQueue.q.getJobCounts();
  const message = `[QUEUE] send-transaction: waiting:${queueData.waiting} active:${queueData.active} completed:${queueData.completed} failed:${queueData.failed}`;

  logger({ service: "worker", level: "info", message });
};

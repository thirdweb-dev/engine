import { type Job, type Processor, Worker } from "bullmq";
import { eth_getTransactionCount, getRpcClient } from "thirdweb";
import {
  inspectNonce,
  isSentNonce,
  recycleNonce,
  splitSentNoncesKey,
} from "../../db/wallets/walletNonce";
import { getConfig } from "../../utils/cache/getConfig";
import { getChain } from "../../utils/chain";
import { prettifyError } from "../../utils/error";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import { NonceResyncQueue } from "../queues/nonceResyncQueue";
import { logWorkerExceptions } from "../queues/queues";

// Must be explicitly called for the worker to run on this host.
export const initNonceResyncWorker = async () => {
  const config = await getConfig();
  if (config.minedTxListenerCronSchedule) {
    NonceResyncQueue.q.add("cron", "", {
      repeat: { pattern: config.minedTxListenerCronSchedule },
      jobId: "nonce-resync-cron",
    });
  }

  const _worker = new Worker(NonceResyncQueue.q.name, handler, {
    connection: redis,
    concurrency: 1,
  });
  logWorkerExceptions(_worker);
};

/**
 * Resyncs nonces for all wallets.
 * This worker should be run periodically to ensure that nonces are not skipped.
 * It checks the onchain nonce for each wallet and recycles any missing nonces.
 *
 * This is to unblock a wallet that has been stuck due to one or more skipped nonces.
 */
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const sentNoncesKeys = await redis.keys("nonce-sent*");
  if (sentNoncesKeys.length === 0) {
    job.log("No active wallets.");
    return;
  }

  for (const sentNonceKey of sentNoncesKeys) {
    try {
      const { chainId, walletAddress } = splitSentNoncesKey(sentNonceKey);

      const rpcRequest = getRpcClient({
        client: thirdwebClient,
        chain: await getChain(chainId),
      });
      const lastUsedNonceOnchain =
        (await eth_getTransactionCount(rpcRequest, {
          address: walletAddress,
          blockTag: "latest",
        })) - 1;
      const lastUsedNonceDb = await inspectNonce(chainId, walletAddress);

      // Recycle all nonces between (onchain nonce, db nonce] if they aren't in-flight ("sent nonce").
      const recycled: number[] = [];
      for (
        let nonce = lastUsedNonceOnchain + 1;
        nonce <= lastUsedNonceDb;
        nonce++
      ) {
        const exists = await isSentNonce(chainId, walletAddress, nonce);
        if (!exists) {
          await recycleNonce(chainId, walletAddress, nonce);
          recycled.push(nonce);
        }
      }

      const message = `wallet=${chainId}:${walletAddress} lastUsedNonceOnchain=${lastUsedNonceOnchain} lastUsedNonceDb=${lastUsedNonceDb}, recycled=${recycled.join(",")}`;
      job.log(message);
      logger({ level: "debug", service: "worker", message });
    } catch (error) {
      logger({
        level: "error",
        message: `[nonceResyncWorker] ${prettifyError(error)}`,
        service: "worker",
      });
    }
  }
};

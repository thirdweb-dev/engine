import { Worker, type Job, type Processor } from "bullmq";
import { eth_getTransactionCount, getRpcClient } from "thirdweb";
import {
  inspectNonce,
  isSentNonce,
  recycleNonce,
  splitSentNoncesKey,
} from "../../shared/db/wallets/wallet-nonce";
import { getConfig } from "../../shared/utils/cache/get-config";
import { getChain } from "../../shared/utils/chain";
import { prettifyError } from "../../shared/utils/error";
import { logger } from "../../shared/utils/logger";
import { redis } from "../../shared/utils/redis/redis";
import { thirdwebClient } from "../../shared/utils/sdk";
import { NonceResyncQueue } from "../queues/nonce-resync-queue";
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
const handler: Processor<string, void, string> = async (job: Job<string>) => {
  const sentNoncesKeys = await redis.keys("nonce-sent:*");
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

      const message = `wallet=${chainId}:${walletAddress} lastUsedNonceOnchain=${lastUsedNonceOnchain} lastUsedNonceDb=${lastUsedNonceDb} numRecycled=${recycled.length} (min=${recycled.at(0) ?? "N/A"} max=${recycled.at(-1) ?? "N/A"})`;
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

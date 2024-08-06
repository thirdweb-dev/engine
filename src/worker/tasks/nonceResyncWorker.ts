import { Job, Processor, Worker } from "bullmq";
import { eth_getTransactionCount, getRpcClient } from "thirdweb";
import {
  lastUsedNonceKey,
  recycleNonce,
  splitSentNoncesKey,
} from "../../db/wallets/walletNonce";
import { getConfig } from "../../utils/cache/getConfig";
import { getChain } from "../../utils/chain";
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

export const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms, null));

/**
 * Resyncs nonces for all wallets.
 * This worker should be run periodically to ensure that nonces are not skipped.
 * It checks the onchain nonce for each wallet and recycles any missing nonces.
 */
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const sentNoncesKeys = await redis.keys("nonce-sent*");
  job.log(`Found ${sentNoncesKeys.length} nonce-sent* keys`);

  for (const sentNonceKey of sentNoncesKeys) {
    const { chainId, walletAddress } = splitSentNoncesKey(sentNonceKey);

    // Check blockchain for nonce
    const rpcRequest = getRpcClient({
      client: thirdwebClient,
      chain: await getChain(chainId),
    });

    // The next unused nonce = transactionCount.
    const transactionCount = await eth_getTransactionCount(rpcRequest, {
      address: walletAddress,
    });

    // Get DB Nonce
    const dbNonceCount = Number(
      await redis.get(lastUsedNonceKey(chainId, walletAddress)),
    );
    job.log(
      `[wallet ${walletAddress}] onchain Nonce: ${transactionCount} and DBNonce: ${dbNonceCount}`,
    );
    logger({
      level: "debug",
      message: `[nonceResyncWorker] onchain Nonce: ${transactionCount} and DBNonce: ${dbNonceCount}`,
      service: "worker",
    });

    if (transactionCount >= dbNonceCount + 1) {
      job.log(`No need to resync nonce for ${walletAddress}`);
      logger({
        level: "debug",
        message: `[nonceResyncWorker] No need to resync nonce for ${walletAddress}`,
        service: "worker",
      });
      return;
    }

    // Check if nonce exists in nonce-sent set
    // If not, recycle nonce
    for (let _nonce = transactionCount; _nonce < dbNonceCount; _nonce++) {
      if (isNaN(_nonce)) {
        continue;
      }
      const exists = await redis.sismember(sentNonceKey, _nonce.toString());
      logger({
        level: "debug",
        message: `[nonceResyncWorker] Nonce ${_nonce} Exists in sentnonce Set:  ${
          exists === 1
        }`,
        service: "worker",
      });

      // If nonce does not exist in nonce-sent set, recycle it
      if (!exists) {
        await recycleNonce(chainId, walletAddress, _nonce);
      }
    }
  }
};

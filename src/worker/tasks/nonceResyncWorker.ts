import { Worker, type Job, type Processor } from "bullmq";
import { eth_getTransactionCount, getRpcClient } from "thirdweb";
import {
  inspectNonce,
  isSentNonce,
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

/**
 * Resyncs nonces for all wallets.
 * This worker should be run periodically to ensure that nonces are not skipped.
 * It checks the onchain nonce for each wallet and recycles any missing nonces.
 *
 * This is to unblock a wallet that has been stuck due to one or more skipped nonces.
 */
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const sentNoncesKeys = await redis.keys("nonce-sent*");
  job.log(`Found ${sentNoncesKeys.length} nonce-sent* keys`);

  for (const sentNonceKey of sentNoncesKeys) {
    const { chainId, walletAddress } = splitSentNoncesKey(sentNonceKey);

    const rpcRequest = getRpcClient({
      client: thirdwebClient,
      chain: await getChain(chainId),
    });

    const [transactionCount, lastUsedNonceDb] = await Promise.all([
      eth_getTransactionCount(rpcRequest, {
        address: walletAddress,
        blockTag: "latest",
      }),
      inspectNonce(chainId, walletAddress),
    ]);

    if (Number.isNaN(transactionCount)) {
      job.log(
        `Received invalid onchain transaction count for ${walletAddress}: ${transactionCount}`,
      );
      logger({
        level: "error",
        message: `[nonceResyncWorker] Received invalid onchain transaction count for ${walletAddress}: ${transactionCount}`,
        service: "worker",
      });
      continue;
    }

    const lastUsedNonceOnchain = transactionCount - 1;

    job.log(
      `${walletAddress} last used onchain nonce: ${lastUsedNonceOnchain} and last used db nonce: ${lastUsedNonceDb}`,
    );
    logger({
      level: "debug",
      message: `[nonceResyncWorker] last used onchain nonce: ${transactionCount} and last used db nonce: ${lastUsedNonceDb}`,
      service: "worker",
    });

    // If the last used nonce onchain is the same as or ahead of the last used nonce in the db,
    // There is no need to resync the nonce.
    if (lastUsedNonceOnchain >= lastUsedNonceDb) {
      job.log(`No need to resync nonce for ${walletAddress}`);
      logger({
        level: "debug",
        message: `[nonceResyncWorker] No need to resync nonce for ${walletAddress}`,
        service: "worker",
      });
      continue;
    }

    //  for each nonce between last used db nonce and last used onchain nonce
    //    check if nonce exists in nonce-sent set
    //    if it does not exist, recycle it
    for (
      let _nonce = lastUsedNonceOnchain + 1;
      _nonce < lastUsedNonceDb;
      _nonce++
    ) {
      const exists = await isSentNonce(chainId, walletAddress, _nonce);
      logger({
        level: "debug",
        message: `[nonceResyncWorker] nonce ${_nonce} exists in nonce-sent set: ${exists}`,
        service: "worker",
      });

      // If nonce does not exist in nonce-sent set, recycle it
      if (!exists) {
        await recycleNonce(chainId, walletAddress, _nonce);
      }
    }
  }
};

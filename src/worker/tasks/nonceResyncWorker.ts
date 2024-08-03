import { Job, Processor, Worker } from "bullmq";
import { eth_getTransactionCount, getRpcClient } from "thirdweb";
import {
  lastUsedNonceKey,
  recycleNonce,
  recycledNoncesKey,
} from "../../db/wallets/walletNonce";
import { getConfig } from "../../utils/cache/getConfig";
import { getChain } from "../../utils/chain";
import { logger } from "../../utils/logger";
import { normalizeAddress } from "../../utils/primitiveTypes";
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

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const sentnonceKeys = await redis.keys("*sentnonce*");
  job.log(`Found ${sentnonceKeys.length} sentnonce keys`);

  for (const sentNonceKey of sentnonceKeys) {
    const _splittedKeys = sentNonceKey.split(":");
    const walletAddress = normalizeAddress(_splittedKeys[1]);
    const chainId = parseInt(_splittedKeys[2]);
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
    job.log(`onchain Nonce: ${transactionCount} and DBNonce: ${dbNonceCount}`);
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
      if (!exists) {
        const positionInList = await redis.lpos(
          recycledNoncesKey(chainId, walletAddress),
          _nonce.toString(),
        );
        logger({
          level: "debug",
          message: `[nonceResyncWorker] Position of nonce in recycle list: ${positionInList}`,
          service: "worker",
        });

        if (positionInList === null) {
          job.log(`Recycle nonce ${_nonce}`);
          // recycle nonce
          await recycleNonce(chainId, walletAddress, _nonce);
        } else {
          logger({
            level: "debug",
            message: `[nonceResyncWorker] Nonce ${_nonce} already in recycle list`,
            service: "worker",
          });
        }
      }
    }
  }
};

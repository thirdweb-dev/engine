import { type Job, type Processor, Worker } from "bullmq";
import type { Address } from "thirdweb";
import {
  deleteNoncesForBackendWallets,
  recycleNonce,
} from "../../shared/db/wallets/wallet-nonce.js";
import {
  isInsufficientFundsError,
  isNonceAlreadyUsedError,
} from "../../shared/utils/error.js";
import { logger } from "../../shared/utils/logger.js";
import { redis } from "../../shared/utils/redis/redis.js";
import { sendCancellationTransaction } from "../../shared/utils/transaction/cancel-transaction.js";
import { CancelRecycledNoncesQueue } from "../queues/cancel-recycled-nonces-queue.js";
import { logWorkerExceptions } from "../queues/queues.js";

// Must be explicitly called for the worker to run on this host.
export const initCancelRecycledNoncesWorker = () => {
  CancelRecycledNoncesQueue.q.add("cron", "", {
    repeat: { pattern: "* * * * *" },
    jobId: "cancel-recycled-nonces-cron",
  });

  const _worker = new Worker(CancelRecycledNoncesQueue.q.name, handler, {
    connection: redis,
    concurrency: 1,
  });
  logWorkerExceptions(_worker);
};

/**
 * Sends a cancel transaction for all recycled nonces.
 */
const handler: Processor<string, void, string> = async (job: Job<string>) => {
  const keys = await redis.keys("nonce-recycled:*");

  for (const key of keys) {
    const { chainId, walletAddress } = fromRecycledNoncesKey(key);

    const recycledNonces = await getAndDeleteRecycledNonces(key);
    job.log(`Found recycled nonces: key=${key} nonces=${recycledNonces}`);

    if (recycledNonces.length > 0) {
      const success: number[] = [];
      const fail: number[] = [];
      const ignore: number[] = [];
      for (const nonce of recycledNonces) {
        try {
          await sendCancellationTransaction({
            chainId,
            from: walletAddress,
            nonce,
          });
          success.push(nonce);
        } catch (error: unknown) {
          if (isInsufficientFundsError(error)) {
            // Wallet is out of funds. Reset the nonce state.
            // After funded, the next transaction will resync the nonce.
            job.log(
              `Wallet ${chainId}:${walletAddress} out of funds. Resetting nonce.`,
            );
            await deleteNoncesForBackendWallets([{ chainId, walletAddress }]);
          } else if (isNonceAlreadyUsedError(error)) {
            // Nonce is used. Don't recycle it.
            ignore.push(nonce);
          } else {
            // Nonce is not used onchain. Recycle it.
            job.log(`Recycling nonce: ${nonce}`);
            await recycleNonce(chainId, walletAddress, nonce);
            fail.push(nonce);
          }
        }
      }

      const message = `Cancelling nonces for ${key}. success=${success} fail=${fail} ignored=${ignore}`;
      job.log(message);
      logger({ service: "worker", level: "info", message });
    }
  }
};

const fromRecycledNoncesKey = (key: string) => {
  const [_, chainId, walletAddress] = key.split(":");

  if (!chainId || !walletAddress) {
    throw new Error(`Invalid key: ${key}`);
  }

  return {
    chainId: Number.parseInt(chainId),
    walletAddress: walletAddress as Address,
  };
};

const getAndDeleteRecycledNonces = async (key: string) => {
  // Returns all recycled nonces for this key and deletes the key.
  // Example response:
  // [
  //   [ null, [ '1', '2', '3', '4' ] ],
  //   [ null, 1 ]
  // ]
  const multiResult = await redis.multi().zrange(key, 0, -1).del(key).exec();
  if (!multiResult) {
    throw new Error(`Error getting members of ${key}.`);
  }

  const result = multiResult[0];

  if (!result) {
    throw new Error(`Error getting members of ${key}.`);
  }

  const [error, nonces] = result;
  if (error) {
    throw new Error(`Error getting members of ${key}: ${error}`);
  }
  // No need to sort here as ZRANGE returns elements in ascending order
  return (nonces as string[]).map((v) => Number.parseInt(v));
};

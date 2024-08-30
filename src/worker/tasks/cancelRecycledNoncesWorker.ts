import { Job, Processor, Worker } from "bullmq";
import { Address } from "thirdweb";
import { recycleNonce } from "../../db/wallets/walletNonce";
import { isNonceAlreadyUsedError } from "../../utils/error";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { sendCancellationTransaction } from "../../utils/transaction/cancelTransaction";
import { CancelRecycledNoncesQueue } from "../queues/cancelRecycledNoncesQueue";
import { logWorkerExceptions } from "../queues/queues";

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
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const keys = await redis.keys("nonce-recycled:*");

  for (const key of keys) {
    const { chainId, walletAddress } = fromUnusedNoncesKey(key);

    const unusedNonces = await getAndDeleteUnusedNonces(key);
    job.log(`Found unused nonces: key=${key} nonces=${unusedNonces}`);

    if (unusedNonces.length > 0) {
      const success: number[] = [];
      const fail: number[] = [];
      const ignore: number[] = [];
      for (const nonce of unusedNonces) {
        try {
          await sendCancellationTransaction({
            chainId,
            from: walletAddress,
            nonce,
          });
          success.push(nonce);
        } catch (error: unknown) {
          // Release the nonce if it has not expired.
          if (isNonceAlreadyUsedError(error)) {
            ignore.push(nonce);
          } else {
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

const fromUnusedNoncesKey = (key: string) => {
  const [_, chainId, walletAddress] = key.split(":");
  return {
    chainId: parseInt(chainId),
    walletAddress: walletAddress as Address,
  };
};

const getAndDeleteUnusedNonces = async (key: string) => {
  // Returns all unused nonces for this key and deletes the key.
  // Example response:
  // [
  //   [ null, [ '1', '2', '3', '4' ] ],
  //   [ null, 1 ]
  // ]
  const multiResult = await redis.multi().smembers(key).del(key).exec();
  if (!multiResult) {
    throw new Error(`Error getting members of ${key}.`);
  }
  const [error, nonces] = multiResult[0];
  if (error) {
    throw new Error(`Error getting members of ${key}: ${error}`);
  }
  return (nonces as string[]).map((v) => parseInt(v)).sort();
};

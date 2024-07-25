import { Job, Processor, Worker } from "bullmq";
import { ethers } from "ethers";
import { Address } from "thirdweb";
import { releaseNonce } from "../../db/wallets/walletNonce";
import { isEthersErrorCode } from "../../utils/ethers";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { sendCancellationTransaction } from "../../utils/transaction/cancelTransaction";
import { CANCEL_UNUSED_NONCES_QUEUE_NAME } from "../queues/cancelUnusedNoncesQueue";
import { logWorkerExceptions } from "../queues/queues";

/**
 * Responsibilities:
 * - Loop through each unused nonce in all wallets.
 * - Cancel the transaction.
 * - If failed, add it back to the unused nonces list.
 */
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const keys = await redis.keys("nonce-unused:*");

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
        } catch (e: unknown) {
          // Release the nonce if it has not expired.
          if (isEthersErrorCode(e, ethers.errors.NONCE_EXPIRED)) {
            ignore.push(nonce);
          } else {
            await releaseNonce(chainId, walletAddress, nonce);
            fail.push(nonce);
          }
        }
      }

      const message = `Cancelling nonces for ${key}. success=${success} fail=${fail} ignored=${ignore}`;
      job.log(message);
      logger({ level: "info", message, service: "worker" });
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
  const script = `
    local key = ARGV[1]
    local members = redis.call('LRANGE', key, 0, -1)
    redis.call('DEL', key)
    return members
`;
  const results = (await redis.eval(script, 0, key)) as string[];
  return results.map(parseInt);
};

// Worker
const _worker = new Worker(CANCEL_UNUSED_NONCES_QUEUE_NAME, handler, {
  concurrency: 1,
  connection: redis,
});
logWorkerExceptions(_worker);

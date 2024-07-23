import { Job, Processor, Worker } from "bullmq";
import { Address } from "thirdweb";
import { addUnusedNonce } from "../../db/wallets/walletNonce";
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
const handler: Processor<any, void, string> = async (_: Job<string>) => {
  const keys = await redis.keys("nonce-unused:*");
  for (const key of keys) {
    const { chainId, walletAddress } = fromUnusedNoncesKey(key);

    const unusedNonces = await getAndDeleteUnusedNonces(key);
    for (const nonce of unusedNonces) {
      try {
        await sendCancellationTransaction({
          chainId,
          from: walletAddress,
          nonce,
        });
      } catch (e) {
        addUnusedNonce(chainId, walletAddress, nonce);
      }
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
  const script = `
    local listKey = ARGV[1]
    local listContents = redis.call('LRANGE', listKey, 0, -1)
    redis.call('DEL', listKey)
    return listContents
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

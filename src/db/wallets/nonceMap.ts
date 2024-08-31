import { Address } from "thirdweb";
import { env } from "../../utils/env";
import { normalizeAddress } from "../../utils/primitiveTypes";
import { redis } from "../../utils/redis/redis";

/**
 * The "nonce map" sorted set stores the queue ID that acquired each nonce.
 * It is pruned to the latest 10k per wallet.
 *
 * Example:
 *   {
 *     "10": "e0fa731e-a947-4587-a48a-c56c02f8e7a8"
 *     "11": "d111435a-1c0c-4308-ba40-59bad0868ee6"
 *   }
 */
const nonceMapKey = (chainId: number, walletAddress: Address) =>
  `nonce-map:${chainId}:${normalizeAddress(walletAddress)}`;

export const updateNonceMap = async (args: {
  chainId: number;
  walletAddress: Address;
  nonce: number;
  queueId: string;
}) => {
  const { chainId, walletAddress, nonce, queueId } = args;
  const key = nonceMapKey(chainId, walletAddress);
  await redis.zadd(key, nonce, queueId);
};

/**
 * Returns (nonce, queueId) pairs sorted by ascending nonce for the
 * given wallet between the specified range.
 */
export const getNonceMap = async (args: {
  chainId: number;
  walletAddress: Address;
  fromNonce: number;
  toNonce: number;
}): Promise<{ nonce: number; queueId: string }[]> => {
  const { chainId, walletAddress, fromNonce, toNonce } = args;
  const key = nonceMapKey(chainId, walletAddress);

  // Returns [ queueId1, nonce1, queueId2, nonce2, ... ]
  const elementsWithScores = await redis.zrangebyscore(
    key,
    fromNonce,
    toNonce,
    "WITHSCORES",
  );

  const result: { nonce: number; queueId: string }[] = [];
  for (let i = 0; i < elementsWithScores.length; i += 2) {
    result.push({
      queueId: elementsWithScores[1],
      nonce: parseInt(elementsWithScores[2]),
    });
  }
  return result;
};

export const pruneNonceMaps = async () => {
  const pipeline = redis.pipeline();
  const keys = await redis.keys("nonce-map:*");
  for (const key of keys) {
    pipeline.zremrangebyrank(key, 0, -env.NONCE_MAP_COUNT);
  }
  await pipeline.exec();
};

import { eth_blockNumber } from "thirdweb";
import { getChain } from "./chain";
import { redis } from "./redis/redis";
import { getRpcRequest } from "./sdk";

/**
 * Returns the latest block number. Falls back to the last known block number.
 * Only use if the precise block number is not required.
 *
 * @param chainId
 * @returns bigint - The latest block number.
 */
export const getBlockNumberish = async (chainId: number): Promise<bigint> => {
  const rpcRequest = getRpcRequest(await getChain(chainId));

  const key = `latestBlock:${chainId}`;
  try {
    const blockNumber = await eth_blockNumber(rpcRequest);
    // Non-blocking update to cache.
    redis.set(key, blockNumber.toString()).catch((e) => {});
    return blockNumber;
  } catch (e) {
    const cached = await redis.get(key);
    if (cached) {
      return BigInt(cached);
    }

    throw new Error("Error getting latest block number.");
  }
};

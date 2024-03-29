import { redis } from "./redis";

const DEFAULT_TTL_SECONDS = 60;

export const getCache = async <T>(key: string): Promise<T | null> => {
  const val = await redis.get(key);
  return val ? (JSON.parse(val) as T) : null;
};

export const setCache = async (
  key: string,
  val: any,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) => {
  await redis.setex(key, ttlSeconds, JSON.stringify(val));
};

export const invalidateCache = async (key: string) => await redis.del(key);

/**
 * Cache keys
 */

export const cacheKeyWalletDetails = (address: string) =>
  `wallet_details:${address.toLowerCase()}`;

export const cacheKeyAllWebhooks = () => "webhooks";

export const cacheKeyConfiguration = () => "configuration";

export const cacheKeyWallet = (
  chainId: number,
  walletAddress: string,
  accountAddress?: string,
) =>
  accountAddress
    ? `${chainId}:${walletAddress}:${accountAddress}`
    : `${chainId}:${walletAddress}`;

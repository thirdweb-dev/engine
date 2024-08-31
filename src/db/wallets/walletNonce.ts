import { Address, eth_getTransactionCount, getRpcClient } from "thirdweb";
import { getChain } from "../../utils/chain";
import { logger } from "../../utils/logger";
import { normalizeAddress } from "../../utils/primitiveTypes";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import { updateNonceMap } from "./nonceMap";

/**
 * The "last used nonce" stores the last nonce submitted onchain.
 * Example: "25"
 */
export const lastUsedNonceKey = (chainId: number, walletAddress: Address) =>
  `nonce:${chainId}:${normalizeAddress(walletAddress)}`;

/**
 * The "recycled nonces" sorted set stores nonces to be reused or cancelled, sorted by nonce value.
 * Example: [ "23", "24", "25" ]
 */
export const recycledNoncesKey = (chainId: number, walletAddress: Address) =>
  `nonce-recycled:${chainId}:${normalizeAddress(walletAddress)}`;

/**
 * The "sent nonces" set stores nonces that have been sent on chain but not yet mined.
 *
 * Example: [ "25", "23", "24" ]
 *
 * The `nonceResyncWorker` periodically fetches the onchain transaction count for each wallet (a),
 * compares it to the last nonce sent (b), and for every nonce between b and a,
 * it recycles the nonce if the nonce is not in this set.
 */
export const sentNoncesKey = (chainId: number, walletAddress: Address) =>
  `nonce-sent:${chainId}:${normalizeAddress(walletAddress)}`;

export const splitSentNoncesKey = (key: string) => {
  const _splittedKeys = key.split(":");
  const walletAddress = normalizeAddress(_splittedKeys[2]);
  const chainId = parseInt(_splittedKeys[1]);
  return { walletAddress, chainId };
};

/**
 * Adds a nonce to the sent nonces set (`nonce-sent:${chainId}:${walletAddress}`).
 */
export const addSentNonce = async (
  chainId: number,
  walletAddress: Address,
  nonce: number,
) => {
  const key = sentNoncesKey(chainId, walletAddress);
  await redis.sadd(key, nonce.toString());
};

/**
 * Removes a nonce from the sent nonces set (`nonce-sent:${chainId}:${walletAddress}`).
 */
export const removeSentNonce = async (
  chainId: number,
  walletAddress: Address,
  nonce: number,
) => {
  const key = sentNoncesKey(chainId, walletAddress);
  const removed = await redis.srem(key, nonce.toString());
  return removed === 1;
};

/**
 * Check if a nonce is in the sent nonces set.
 */
export const isSentNonce = async (
  chainId: number,
  walletAddress: Address,
  nonce: number,
) => {
  const key = sentNoncesKey(chainId, walletAddress);
  return !!(await redis.sismember(key, nonce.toString()));
};

/**
 * Acquire an unused nonce to send an EOA transaction for the given backend wallet.
 * @param chainId
 * @param walletAddress
 * @returns number
 */
export const acquireNonce = async (args: {
  queueId: string;
  chainId: number;
  walletAddress: Address;
}): Promise<{ nonce: number; isRecycledNonce: boolean }> => {
  const { queueId, chainId, walletAddress } = args;

  let isRecycledNonce = false;

  // Try to acquire the lowest recycled nonce first
  let nonce = await _acquireRecycledNonce(chainId, walletAddress);
  if (nonce !== null) {
    isRecycledNonce = true;
  } else {
    // Else increment the last used nonce.
    const key = lastUsedNonceKey(chainId, walletAddress);
    nonce = await redis.incr(key);
    if (nonce === 1) {
      // If INCR returned 1, the nonce was not set.
      // This may be a newly imported wallet.
      // Sync the onchain value and increment again.
      await syncLatestNonceFromOnchain(chainId, walletAddress);
      nonce = await redis.incr(key);
    }
  }

  await updateNonceMap({
    chainId,
    walletAddress,
    nonce,
    queueId,
  });
  return { nonce, isRecycledNonce: false };
};

/**
 * Recycles a nonce to be used by a future transaction.
 * This should be used if the current transaction that acquired this nonce is not valid.
 * @param chainId
 * @param walletAddress
 * @param nonce
 */
export const recycleNonce = async (
  chainId: number,
  walletAddress: Address,
  nonce: number,
) => {
  if (isNaN(nonce)) {
    logger({
      level: "warn",
      message: `[recycleNonce] Invalid nonce: ${nonce}`,
      service: "worker",
    });
    return;
  }

  const key = recycledNoncesKey(chainId, walletAddress);
  await redis.zadd(key, nonce, nonce.toString());
};

/**
 * Acquires the lowest recycled nonce that is unused.
 * @param chainId
 * @param walletAddress
 * @returns
 */
const _acquireRecycledNonce = async (
  chainId: number,
  walletAddress: Address,
): Promise<number | null> => {
  const key = recycledNoncesKey(chainId, walletAddress);
  const result = await redis.zpopmin(key);
  if (result.length === 0) {
    return null;
  }
  return parseInt(result[0]);
};

/**
 * Resync the nonce to the onchain nonce.
 * @TODO: Redis lock this to make this method safe to call concurrently.
 */
export const syncLatestNonceFromOnchain = async (
  chainId: number,
  walletAddress: Address,
) => {
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: await getChain(chainId),
  });

  // The next unused nonce = transactionCount.
  const transactionCount = await eth_getTransactionCount(rpcRequest, {
    address: walletAddress,
    blockTag: "latest",
  });

  const key = lastUsedNonceKey(chainId, walletAddress);
  await redis.set(key, transactionCount - 1);
};

/**
 * Returns the last used nonce.
 * This function should be used to inspect nonce values only.
 * Use `acquireNonce` to fetch a nonce for sending a transaction.
 * @param chainId
 * @param walletAddress
 * @returns number
 */
export const inspectNonce = async (chainId: number, walletAddress: Address) => {
  const key = lastUsedNonceKey(chainId, walletAddress);
  const nonce = await redis.get(key);
  return nonce ? parseInt(nonce) : 0;
};

/**
 * Delete all wallet nonces. Useful when they get out of sync.
 */
export const deleteAllNonces = async () => {
  const keys = [
    ...(await redis.keys("nonce:*")),
    ...(await redis.keys("nonce-recycled:*")),
    ...(await redis.keys("sent-nonce:*")),
  ];
  if (keys.length > 0) {
    await redis.del(keys);
  }
};

/**
 * Resync the nonce to the higher of (db nonce, onchain nonce).
 */
export const syncLatestNonceFromOnchainIfHigher = async (
  chainId: number,
  walletAddress: Address,
) => {
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: await getChain(chainId),
  });

  // The next unused nonce = transactionCount.
  const transactionCount = await eth_getTransactionCount(rpcRequest, {
    address: walletAddress,
    blockTag: "latest",
  });

  // Lua script to update the DB nonce only if the onchain nonce is higher.
  const script = `
    local transactionCount = tonumber(ARGV[1])
    local lastUsedNonce = tonumber(redis.call('get', KEYS[1])) or 0
    local nextNonce = math.max(transactionCount-1, lastUsedNonce)
    redis.call('set', KEYS[1], nextNonce)
    return nextNonce
  `;
  const lastUsedNonce = await redis.eval(
    script,
    1,
    lastUsedNonceKey(chainId, normalizeAddress(walletAddress)),
    transactionCount.toString(),
  );
  return lastUsedNonce;
};

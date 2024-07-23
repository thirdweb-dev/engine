import { Address, eth_getTransactionCount, getRpcClient } from "thirdweb";
import { getChain } from "../../utils/chain";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";

/**
 * !IMPORTANT
 *
 * The nonce stored is the LAST USED NONCE.
 * To get the next available nonce, use `incrWalletNonce()`.
 */

const lastUsedNonceKey = (chainId: number, walletAddress: Address) =>
  `nonce:${chainId}:${walletAddress}`;

const unusedNoncesKey = (chainId: number, walletAddress: Address) =>
  `nonce-unused:${chainId}:${walletAddress}`;

/**
 * Acquire an unused nonce.
 * This should be used to send an EOA transaction with this nonce.
 * @param chainId
 * @param walletAddress
 * @returns number - The next unused nonce value for this wallet.
 */
export const getAndUpdateNonce = async (
  chainId: number,
  walletAddress: Address,
) => {
  // Acquire an unused nonce, if any.
  let nonce = await getAndUpdateLowestUnusedNonce(chainId, walletAddress);
  if (nonce) {
    return nonce;
  }

  // Else increment the last used nonce.
  const key = lastUsedNonceKey(chainId, walletAddress);
  nonce = await redis.incr(key);
  if (nonce === 1) {
    // If INCR returned 1, the nonce was not set.
    // This may be a newly imported wallet. Sync and return the onchain nonce.
    return await _syncNonce(chainId, walletAddress);
  }
  return nonce;
};

/**
 * Adds an unused nonce that can be reused by a future transaction.
 * This should be used if the current transaction that acquired this nonce is not valid.
 * @param chainId
 * @param walletAddress
 * @param nonce
 */
export const addUnusedNonce = async (
  chainId: number,
  walletAddress: Address,
  nonce: number,
) => {
  const key = unusedNoncesKey(chainId, walletAddress);
  await redis.zadd(key, nonce, nonce);
};

/**
 * Acquires the lowest unused nonce.
 * @param chainId
 * @param walletAddress
 * @returns
 */
export const getAndUpdateLowestUnusedNonce = async (
  chainId: number,
  walletAddress: Address,
) => {
  const key = unusedNoncesKey(chainId, walletAddress);
  const res = await redis.zpopmin(key);
  if (res.length > 0) {
    // res will be [value, score] where the score is the nonce.
    return parseInt(res[1]);
  }
  return null;
};

const _syncNonce = async (
  chainId: number,
  walletAddress: Address,
): Promise<number> => {
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: await getChain(chainId),
  });

  // The next unused nonce = transactionCount.
  const transactionCount = await eth_getTransactionCount(rpcRequest, {
    address: walletAddress,
  });

  const key = lastUsedNonceKey(chainId, walletAddress);
  await redis.set(key, transactionCount);
  return transactionCount;
};

/**
 * Returns the last used nonce.
 * This function should be used to inspect nonce values only.
 * Use `incrWalletNonce` if using this nonce to send a transaction.
 * @param chainId
 * @param walletAddress
 * @returns number - The last used nonce value for this wallet.
 */
export const getNonce = async (chainId: number, walletAddress: Address) => {
  const key = lastUsedNonceKey(chainId, walletAddress);
  const nonce = await redis.get(key);
  return nonce ? parseInt(nonce) : 0;
};

/**
 * Delete all wallet nonces. Useful when the get out of sync.
 */
export const deleteAllNonces = async () => {
  const keys = await redis.keys("nonce:*");
  if (keys.length > 0) {
    await redis.del(keys);
  }
};

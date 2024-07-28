import { Address, eth_getTransactionCount, getRpcClient } from "thirdweb";
import { getChain } from "../../utils/chain";
import { normalizeAddress } from "../../utils/primitiveTypes";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";

/**
 * The "last used nonce" stores the last nonce submitted onchain.
 * Example: "25"
 */
const lastUsedNonceKey = (chainId: number, walletAddress: Address) =>
  `nonce:${chainId}:${normalizeAddress(walletAddress)}`;

/**
 * The "recycled nonces" list stores unsorted nonces to be reused or cancelled.
 * Example: [ "25", "23", "24" ]
 */
const recycledNoncesKey = (chainId: number, walletAddress: Address) =>
  `nonce-recycled:${chainId}:${normalizeAddress(walletAddress)}`;

/**
 * Acquire an unused nonce.
 * This should be used to send an EOA transaction with this nonce.
 * @param chainId
 * @param walletAddress
 * @returns number
 */
export const acquireNonce = async (
  chainId: number,
  walletAddress: Address,
): Promise<{ nonce: number; isRecycledNonce: boolean }> => {
  // Acquire an recylced nonce, if any.
  let nonce = await _acquireRecycledNonce(chainId, walletAddress);
  if (nonce !== null) {
    return { nonce, isRecycledNonce: true };
  }

  // Else increment the last used nonce.
  const key = lastUsedNonceKey(chainId, walletAddress);
  nonce = await redis.incr(key);
  if (nonce === 1) {
    // If INCR returned 1, the nonce was not set.
    // This may be a newly imported wallet.
    nonce = await _syncNonce(chainId, walletAddress);
  }
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
  const key = recycledNoncesKey(chainId, walletAddress);
  await redis.rpush(key, nonce);
};

/**
 * Acquires a recycled nonce that is unused.
 * @param chainId
 * @param walletAddress
 * @returns
 */
const _acquireRecycledNonce = async (
  chainId: number,
  walletAddress: Address,
) => {
  const key = recycledNoncesKey(chainId, walletAddress);
  const res = await redis.lpop(key);
  return res ? parseInt(res) : null;
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
 * @returns number
 */
export const inspectNonce = async (chainId: number, walletAddress: Address) => {
  const key = lastUsedNonceKey(chainId, walletAddress);
  const nonce = await redis.get(key);
  return nonce ? parseInt(nonce) : 0;
};

/**
 * Delete all wallet nonces. Useful when the get out of sync.
 */
export const deleteAllNonces = async () => {
  const keys = [
    ...(await redis.keys("nonce:*")),
    ...(await redis.keys("nonce-recycled:*")),
  ];
  if (keys.length > 0) {
    await redis.del(keys);
  }
};

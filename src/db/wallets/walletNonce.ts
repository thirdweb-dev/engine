import { Address, eth_getTransactionCount, getRpcClient } from "thirdweb";
import { getChain } from "../../utils/chain";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";

const nonceKey = (chainId: number, walletAddress: Address) =>
  `nonce:${chainId}:${walletAddress}`;

/**
 * Increment to get the next unused nonce.
 * If a nonce is acquired this way, it must be used for an onchain transaction
 * (or cancelled onchain).
 * @param chainId
 * @param walletAddress
 * @returns number - The next unused nonce value for this wallet.
 */
export const incrWalletNonce = async (
  chainId: number,
  walletAddress: Address,
) => {
  const key = nonceKey(chainId, walletAddress);
  let nonce = await redis.incr(key);
  if (nonce === 1) {
    // If INCR returned 1, the nonce was not set.
    // This may be a newly imported wallet. Sync and return the onchain nonce.
    nonce = await _syncWalletNonce(chainId, walletAddress);
  }
  return nonce;
};

const _syncWalletNonce = async (
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

  const key = nonceKey(chainId, walletAddress);
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
export const getWalletNonce = async (
  chainId: number,
  walletAddress: Address,
) => {
  const key = nonceKey(chainId, walletAddress);
  const nonce = await redis.get(key);
  return nonce ? parseInt(nonce) : 0;
};

/**
 * Delete all wallet nonces. Useful when the get out of sync.
 */
export const deleteWalletNonces = async () => {
  const keys = await redis.keys("nonce:*");
  if (keys.length > 0) {
    await redis.del(keys);
  }
};

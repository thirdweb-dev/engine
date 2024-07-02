import {
  Address,
  defineChain,
  eth_getTransactionCount,
  getRpcClient,
} from "thirdweb";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";

const nonceKey = (chainId: number, walletAddress: Address) =>
  `nonce:${chainId}:${walletAddress}`;

export const incrWalletNonce = async (
  chainId: number,
  walletAddress: Address,
) => {
  const key = nonceKey(chainId, walletAddress);
  let nonce = await redis.incr(key);
  if (nonce === 1) {
    // If INCR returned 1, the nonce was not set.
    // This may be a newly imported wallet. Sync and return the onchain nonce.
    nonce = await syncWalletNonce(chainId, walletAddress);
  }
  return nonce;
};

export const syncWalletNonce = async (
  chainId: number,
  walletAddress: Address,
): Promise<number> => {
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: defineChain(chainId),
  });

  // The next unused nonce = transactionCount.
  const transactionCount = await eth_getTransactionCount(rpcRequest, {
    address: walletAddress,
  });

  const key = nonceKey(chainId, walletAddress);
  await redis.set(key, transactionCount);
  return transactionCount;
};

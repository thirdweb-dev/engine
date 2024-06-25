import { Address } from "thirdweb";
import { redis } from "../../utils/redis/redis";

export const incrWalletNonce = async (
  chainId: number,
  walletAddress: Address,
) => {
  const nonce = await redis.incr(`nonce:${chainId}:${walletAddress}`);
  if (nonce === 1) {
  }

  return nonce;
};

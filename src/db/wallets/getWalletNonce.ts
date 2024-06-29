import { WalletNonce } from "@prisma/client";
import { createWalletNonce } from "../wallets/createWalletNonce";
import { redis } from "../../utils/redis/redis";

interface GetWalletNonceParams {
  address: string;
  chainId: number;
  signerAddress?: string;
}

export const getWalletNonce = async ({
  address,
  chainId,
  signerAddress,
}: GetWalletNonceParams): Promise<WalletNonce | null> => {
  const walletNonce = await redis.get(`nonce:${chainId}:${address}`);

  if (!walletNonce) {
    // If we have wallet details or a signer address, create a new nonce
    if (signerAddress) {
      return createWalletNonce({
        address,
        chainId,
        signerAddress,
      });
    } else {
      return null;
    }
  }

  return {
    chainId: chainId.toString(),
    address,
    nonce: parseInt(walletNonce, 10),
  };
};

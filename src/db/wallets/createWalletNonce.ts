import { BigNumber } from "ethers";
import { getSDK } from "../../../core/sdk/sdk";
import { getWalletNonce } from "../../../core/services/blockchain";
import { prisma } from "../client";

interface CreateWalletNonceParams {
  chainId: number;
  walletAddress: string;
}

export const createWalletNonce = async ({
  chainId,
  walletAddress,
}: CreateWalletNonceParams) => {
  // TODO: chainId instead of chainName being passed around everywhere
  // or just pass SDK around
  const sdk = await getSDK(chainId.toString(), walletAddress);
  // TODO: Replace BigNumber
  const nonce = BigNumber.from(
    (await getWalletNonce(walletAddress.toLowerCase(), sdk.getProvider())) ?? 0,
  ).toNumber();

  return prisma.walletNonce.create({
    data: {
      chainId,
      address: walletAddress,
      nonce,
    },
  });
};

import { BigNumber } from "ethers";
import { getSDK } from "../../../core/sdk/sdk";
import { getWalletNonce } from "../../../core/services/blockchain";
import { prisma } from "../client";

interface CreateWalletNonceParams {
  chainId: number;
  address: string;
}

export const createWalletNonce = async ({
  chainId,
  address,
}: CreateWalletNonceParams) => {
  // TODO: chainId instead of chainName being passed around everywhere
  // or just pass SDK around
  const sdk = await getSDK(chainId.toString());
  // TODO: Replace BigNumber
  const nonce = BigNumber.from(
    (await getWalletNonce(address.toLowerCase(), sdk.getProvider())) ?? 0,
  ).toNumber();

  return prisma.walletNonce.create({
    data: {
      address: address.toLowerCase(),
      chainId,
      nonce,
    },
  });
};

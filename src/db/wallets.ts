import type { WalletDetails } from "@prisma/client";
import { prisma } from "./client";

// TODO: Add error logging handler from req.log to all queries
export const getAllWallets = async (chainId: number) => {
  return prisma.walletNonce.findMany({
    where: {
      chainId,
    },
  });
};

export const createWalletDetails = async (walletDetails: WalletDetails) => {
  return prisma.walletDetails.create({
    data: walletDetails,
  });
};

/*
export const createWalletNonce = async (
  chainId: number,
  walletAddress: string,
) => {
  // TODO: Merge with furqan's branch...
  const sdk = await getSDK(chainId);
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
*/

export const updateWalletNonce = async (
  chainId: number,
  walletAddress: string,
  nonce: number,
) => {
  await prisma.walletNonce.update({
    where: {
      address_chainId: {
        address: walletAddress,
        chainId,
      },
    },
    data: {
      nonce,
    },
  });
};

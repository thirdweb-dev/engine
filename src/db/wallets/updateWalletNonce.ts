import { prisma } from "../client";

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

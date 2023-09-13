import { prisma } from "../client";

interface UpdateWalletNonceParams {
  chainId: number;
  address: string;
  nonce: number;
}

export const updateWalletNonce = async ({
  chainId,
  address,
  nonce,
}: UpdateWalletNonceParams) => {
  await prisma.walletNonce.update({
    where: {
      address_chainId: {
        address: address.toLowerCase(),
        chainId,
      },
    },
    data: {
      nonce,
    },
  });
};

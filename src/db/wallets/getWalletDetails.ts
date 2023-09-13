import { prisma } from "../client";
import { WalletWithNonceAndDetails, cleanWallet } from "./cleanWallet";
import { createWalletNonce } from "./createWalletNonce";

interface GetWalletDetailsParams {
  address: string;
  chainId: number;
  isRecursive?: boolean;
}

export const getWalletDetails = async ({
  address,
  chainId,
  isRecursive,
}: GetWalletDetailsParams): Promise<WalletWithNonceAndDetails | null> => {
  const wallet = await prisma.walletNonce.findUnique({
    where: {
      address_chainId: {
        address: address.toLowerCase(),
        chainId,
      },
    },
    include: {
      walletDetails: true,
    },
  });

  if (!wallet) {
    if (!isRecursive) {
      // TODO: Change this!
      const walletDetails = await prisma.walletDetails.findUnique({
        where: {
          address,
        },
      });

      // If we have wallet details, but not a wallet nonce for the chain, create one
      if (walletDetails) {
        await createWalletNonce({
          address,
          chainId,
        });

        return getWalletDetails({ address, chainId, isRecursive: true });
      }
    }

    return wallet;
  }

  return cleanWallet(wallet);
};

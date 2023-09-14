import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { WalletWithNonceAndDetails, cleanWallet } from "./cleanWallet";
import { createWalletNonce } from "./createWalletNonce";

interface GetWalletDetailsParams {
  pgtx?: PrismaTransaction;
  address: string;
  chainId: number;
  isRecursive?: boolean;
}

export const getWalletDetails = async ({
  pgtx,
  address,
  chainId,
  isRecursive,
}: GetWalletDetailsParams): Promise<WalletWithNonceAndDetails | null> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

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
          pgtx,
          address,
          chainId,
        });

        return getWalletDetails({ pgtx, address, chainId, isRecursive: true });
      }
    }

    return wallet;
  }

  return cleanWallet(wallet);
};

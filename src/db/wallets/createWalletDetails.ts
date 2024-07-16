import { PrismaTransaction } from "../../schema/prisma";
import type { WalletType } from "../../schema/wallet";
import { getPrismaWithPostgresTx } from "../client";

// TODO: Case on types by wallet type
interface CreateWalletDetailsParams {
  pgtx?: PrismaTransaction;
  address: string;
  type: WalletType;
  label?: string;
  encryptedJson?: string;
  awsKmsKeyId?: string;
  awsKmsArn?: string;
  gcpKmsKeyRingId?: string;
  gcpKmsKeyId?: string;
  gcpKmsKeyVersionId?: string;
  gcpKmsLocationId?: string;
  gcpKmsResourcePath?: string;
  smartAccountEOAAddress?: string;
  smartAccountFactoryAddress?: string;
}

export const createWalletDetails = async ({
  pgtx,
  ...walletDetails
}: CreateWalletDetailsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  if (walletDetails.type === "smart") {
    //deploy smart account
    // if factory use that
  }

  const wallet = await prisma.walletDetails.findUnique({
    where: {
      address: walletDetails.address.toLowerCase(),
    },
  });

  if (wallet) {
    throw new Error(
      `Wallet with address ${walletDetails.address} has already been added!`,
    );
  }

  return prisma.walletDetails.create({
    data: {
      ...walletDetails,
      address: walletDetails.address.toLowerCase(),
    },
  });
};

import { PrismaTransaction } from "../../schema/prisma";
import type { WalletType } from "../../schema/wallet";
import { getPrismaWithPostgresTx } from "../client";

// TODO: Case on types by wallet type
interface CreateBackendWalletParams {
  pgtx?: PrismaTransaction;
  address: string;
  type: WalletType;
  awsKmsKeyId?: string;
  awsKmsArn?: string;
  gcpKmsKeyRingId?: string;
  gcpKmsKeyId?: string;
  gcpKmsKeyVersionId?: string;
  gcpKmsLocationId?: string;
  gcpKmsResourcePath?: string;
}

export const createBackendWallet = async ({
  pgtx,
  ...config
}: CreateBackendWalletParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const wallet = await prisma.backendWallet.findUnique({
    where: {
      address: config.address.toLowerCase(),
    },
  });

  if (wallet) {
    throw new Error(
      `Wallet with address ${config.address} has already been added!`,
    );
  }

  return prisma.backendWallet.create({
    data: {
      ...config,
      address: config.address.toLowerCase(),
    },
  });
};

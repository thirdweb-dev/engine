import { PrismaTransaction } from "../../schema/prisma";
import type { WalletType } from "../../schema/wallet";
import { getPrismaWithPostgresTx } from "../client";

// TODO: Case on types by wallet type
interface CreateWalletDetailsParams {
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

export const createWalletDetails = async ({
  pgtx,
  ...walletDetails
}: CreateWalletDetailsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  return prisma.walletDetails.create({
    data: {
      ...walletDetails,
      address: walletDetails.address.toLowerCase(),
    },
  });
};

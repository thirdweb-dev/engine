import type { WalletType } from "../../schema/wallet";
import { prisma } from "../client";

// TODO: Case on types by wallet type
interface CreateWalletDetailsParams {
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

export const createWalletDetails = async (
  walletDetails: CreateWalletDetailsParams,
) => {
  return prisma.walletDetails.create({
    data: {
      ...walletDetails,
      address: walletDetails.address.toLowerCase(),
    },
  });
};

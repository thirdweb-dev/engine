import type { PrismaTransaction } from "../../schema/prisma";
import type { WalletType } from "../../schema/wallet";
import { encrypt } from "../../utils/crypto";
import { getPrismaWithPostgresTx } from "../client";

// TODO: Case on types by wallet type
interface CreateWalletDetailsParams {
  pgtx?: PrismaTransaction;
  address: string;
  type: WalletType;
  label?: string;

  // AWS KMS
  awsKmsKeyId?: string; // depcrecated and unused, todo: remove with next breaking change
  awsKmsArn?: string;

  awsKmsSecretAccessKey?: string; // encrypted
  awsKmsAccessKeyId?: string;

  // GCP KMS
  gcpKmsResourcePath?: string;
  gcpKmsKeyRingId?: string; // depcrecated and unused, todo: remove with next breaking change
  gcpKmsKeyId?: string; // depcrecated and unused, todo: remove with next breaking change
  gcpKmsKeyVersionId?: string; // depcrecated and unused, todo: remove with next breaking change
  gcpKmsLocationId?: string; // depcrecated and unused, todo: remove with next breaking change

  gcpApplicationCredentialPrivateKey?: string; // encrypted
  gcpApplicationCredentialEmail?: string;
}

export const createWalletDetails = async ({
  pgtx,
  ...walletDetails
}: CreateWalletDetailsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

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

      awsKmsSecretAccessKey: walletDetails.awsKmsSecretAccessKey
        ? encrypt(walletDetails.awsKmsSecretAccessKey)
        : undefined,

      gcpApplicationCredentialPrivateKey:
        walletDetails.gcpApplicationCredentialPrivateKey
          ? encrypt(walletDetails.gcpApplicationCredentialPrivateKey)
          : undefined,
    },
  });
};

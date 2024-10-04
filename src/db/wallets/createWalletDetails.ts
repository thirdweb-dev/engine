import type { PrismaTransaction } from "../../schema/prisma";
import { encrypt } from "../../utils/crypto";
import { getPrismaWithPostgresTx } from "../client";

// TODO: Case on types by wallet type
type CreateWalletDetailsParams = {
  pgtx?: PrismaTransaction;
  address: string;
  label?: string;
} & (
  | {
      type: "aws-kms";
      awsKmsKeyId?: string; // depcrecated and unused, todo: remove with next breaking change
      awsKmsArn: string;

      awsKmsSecretAccessKey?: string; // will be encrypted and stored, pass plaintext to this function
      awsKmsAccessKeyId?: string;
    }
  | {
      type: "gcp-kms";
      gcpKmsResourcePath: string;
      gcpKmsKeyRingId?: string; // depcrecated and unused, todo: remove with next breaking change
      gcpKmsKeyId?: string; // depcrecated and unused, todo: remove with next breaking change
      gcpKmsKeyVersionId?: string; // depcrecated and unused, todo: remove with next breaking change
      gcpKmsLocationId?: string; // depcrecated and unused, todo: remove with next breaking change

      gcpApplicationCredentialPrivateKey?: string; // encrypted
      gcpApplicationCredentialEmail?: string;
    }
);

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

  if (walletDetails.type === "aws-kms") {
    return prisma.walletDetails.create({
      data: {
        ...walletDetails,
        address: walletDetails.address.toLowerCase(),

        awsKmsSecretAccessKey: walletDetails.awsKmsSecretAccessKey
          ? encrypt(walletDetails.awsKmsSecretAccessKey)
          : undefined,
      },
    });
  }

  if (walletDetails.type === "gcp-kms") {
    return prisma.walletDetails.create({
      data: {
        ...walletDetails,
        address: walletDetails.address.toLowerCase(),

        gcpApplicationCredentialPrivateKey:
          walletDetails.gcpApplicationCredentialPrivateKey
            ? encrypt(walletDetails.gcpApplicationCredentialPrivateKey)
            : undefined,
      },
    });
  }
};

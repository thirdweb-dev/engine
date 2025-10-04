import type { Address } from "thirdweb";
import type { PrismaTransaction } from "../../schemas/prisma";
import { encrypt } from "../../utils/crypto";
import { getPrismaWithPostgresTx } from "../client";

// TODO: Case on types by wallet type
type CreateWalletDetailsParams = {
  pgtx?: PrismaTransaction;
  address: string;
  label?: string;
} & (
  | {
      type: "local";
      encryptedJson: string; // ENCRYPTION IS NOT HANDLED HERE, process privatekey with legacyLocalCrytpo before passing to this function
    }
  | {
      type: "aws-kms";
      awsKmsKeyId?: string; // deprecated and unused, todo: remove with next breaking change
      awsKmsArn: string;

      awsKmsSecretAccessKey?: string; // will be encrypted and stored, pass plaintext to this function
      awsKmsAccessKeyId?: string;
    }
  | {
      type: "gcp-kms";
      gcpKmsResourcePath: string;
      gcpKmsKeyRingId?: string; // deprecated and unused, todo: remove with next breaking change
      gcpKmsKeyId?: string; // deprecated and unused, todo: remove with next breaking change
      gcpKmsKeyVersionId?: string; // deprecated and unused, todo: remove with next breaking change
      gcpKmsLocationId?: string; // deprecated and unused, todo: remove with next breaking change

      gcpApplicationCredentialPrivateKey: string; // will be encrypted and stored, pass plaintext to this function
      gcpApplicationCredentialEmail: string;
    }
  | {
      type: "smart:aws-kms";
      awsKmsArn: string;
      awsKmsSecretAccessKey?: string; // will be encrypted and stored, pass plaintext to this function
      awsKmsAccessKeyId?: string;
      accountSignerAddress: Address;

      accountFactoryAddress: Address | undefined;
      entrypointAddress: Address | undefined;
    }
  | {
      type: "smart:gcp-kms";
      gcpKmsResourcePath: string;
      gcpApplicationCredentialPrivateKey: string; // will be encrypted and stored, pass plaintext to this function
      gcpApplicationCredentialEmail: string;
      accountSignerAddress: Address;

      accountFactoryAddress: Address | undefined;
      entrypointAddress: Address | undefined;
    }
  | {
      type: "smart:local";
      encryptedJson: string; // ENCRYPTION IS NOT HANDLED HERE, process privatekey with legacyLocalCrytpo before passing to this function
      accountSignerAddress: Address;

      accountFactoryAddress: Address | undefined;
      entrypointAddress: Address | undefined;
    }
);

/**
 * Create a new WalletDetails row in DB
 */
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

  if (walletDetails.type === "local") {
    return prisma.walletDetails.create({
      data: {
        ...walletDetails,
        address: walletDetails.address.toLowerCase(),
        encryptedJson: walletDetails.encryptedJson,
      },
    });
  }

  if (walletDetails.type === "aws-kms") {
    return prisma.walletDetails.create({
      data: {
        ...walletDetails,
        address: walletDetails.address.toLowerCase(),

        awsKmsSecretAccessKey: walletDetails.awsKmsSecretAccessKey 
          ? encrypt(walletDetails.awsKmsSecretAccessKey)
          : null,
      },
    });
  }

  if (walletDetails.type === "gcp-kms") {
    return prisma.walletDetails.create({
      data: {
        ...walletDetails,
        address: walletDetails.address.toLowerCase(),

        gcpApplicationCredentialPrivateKey: encrypt(
          walletDetails.gcpApplicationCredentialPrivateKey,
        ),
      },
    });
  }

  if (walletDetails.type === "smart:aws-kms") {
    return prisma.walletDetails.create({
      data: {
        ...walletDetails,

        address: walletDetails.address.toLowerCase(),
        awsKmsSecretAccessKey: walletDetails.awsKmsSecretAccessKey 
          ? encrypt(walletDetails.awsKmsSecretAccessKey)
          : null,
        accountSignerAddress: walletDetails.accountSignerAddress.toLowerCase(),

        accountFactoryAddress:
          walletDetails.accountFactoryAddress?.toLowerCase(),
        entrypointAddress: walletDetails.entrypointAddress?.toLowerCase(),
      },
    });
  }

  if (walletDetails.type === "smart:gcp-kms") {
    return prisma.walletDetails.create({
      data: {
        ...walletDetails,

        address: walletDetails.address.toLowerCase(),
        accountSignerAddress: walletDetails.accountSignerAddress.toLowerCase(),

        gcpApplicationCredentialPrivateKey: encrypt(
          walletDetails.gcpApplicationCredentialPrivateKey,
        ),

        accountFactoryAddress:
          walletDetails.accountFactoryAddress?.toLowerCase(),
        entrypointAddress: walletDetails.entrypointAddress?.toLowerCase(),
      },
    });
  }

  if (walletDetails.type === "smart:local") {
    return prisma.walletDetails.create({
      data: {
        ...walletDetails,
        address: walletDetails.address.toLowerCase(),
        accountSignerAddress: walletDetails.accountSignerAddress.toLowerCase(),

        accountFactoryAddress:
          walletDetails.accountFactoryAddress?.toLowerCase(),
        entrypointAddress: walletDetails.entrypointAddress?.toLowerCase(),
      },
    });
  }

  throw new Error("Unsupported wallet type");
};

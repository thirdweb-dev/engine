import { z } from "zod";
import type { PrismaTransaction } from "../../schemas/prisma";
import { getConfig } from "../../utils/cache/get-config";
import { decryptWithCustomPassword } from "../../utils/crypto";
import { env } from "../../utils/env";
import { getPrismaWithPostgresTx } from "../client";
import { evmAddressSchema } from "../../schemas/address";

interface GetWalletDetailsParams {
  pgtx?: PrismaTransaction;
  address: string;
}

export class WalletDetailsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletDetailsError";
  }
}

const baseWalletPartialSchema = z.object({
  address: evmAddressSchema,
  label: z.string().nullable(),
});

const smartWalletPartialSchema = z.object({
  accountSignerAddress: evmAddressSchema,
  accountFactoryAddress: evmAddressSchema.nullable(),
  entrypointAddress: evmAddressSchema.nullable(),
});

const localWalletSchema = z
  .object({
    type: z.literal("local"),
    encryptedJson: z.string(),
  })
  .merge(baseWalletPartialSchema);

const smartLocalWalletSchema = localWalletSchema
  .extend({
    type: z.literal("smart:local"),
  })
  .merge(smartWalletPartialSchema)
  .merge(baseWalletPartialSchema);

const awsKmsWalletSchema = z
  .object({
    type: z.literal("aws-kms"),
    awsKmsArn: z.string(),
    awsKmsSecretAccessKey: z.string(),
    awsKmsAccessKeyId: z.string(),
  })
  .merge(baseWalletPartialSchema);

const smartAwsKmsWalletSchema = awsKmsWalletSchema
  .extend({
    type: z.literal("smart:aws-kms"),
  })
  .merge(smartWalletPartialSchema)
  .merge(baseWalletPartialSchema);

const gcpKmsWalletSchema = z
  .object({
    type: z.literal("gcp-kms"),
    gcpKmsResourcePath: z.string(),
    gcpApplicationCredentialPrivateKey: z.string(),
    gcpApplicationCredentialEmail: z.string(),
  })
  .merge(baseWalletPartialSchema);

const smartGcpKmsWalletSchema = gcpKmsWalletSchema
  .extend({
    type: z.literal("smart:gcp-kms"),
  })
  .merge(smartWalletPartialSchema)
  .merge(baseWalletPartialSchema);

const walletDetailsSchema = z.discriminatedUnion("type", [
  localWalletSchema,
  smartLocalWalletSchema,
  awsKmsWalletSchema,
  smartAwsKmsWalletSchema,
  gcpKmsWalletSchema,
  smartGcpKmsWalletSchema,
]);

export type SmartBackendWalletDetails =
  | z.infer<typeof smartLocalWalletSchema>
  | z.infer<typeof smartAwsKmsWalletSchema>
  | z.infer<typeof smartGcpKmsWalletSchema>;

export function isSmartBackendWallet(
  wallet: ParsedWalletDetails,
): wallet is SmartBackendWalletDetails {
  return SmartBackendWalletTypes.includes(
    wallet.type as SmartBackendWalletType,
  );
}

export const SmartBackendWalletTypes = [
  "smart:local",
  "smart:aws-kms",
  "smart:gcp-kms",
] as const;

export const BackendWalletTypes = [
  "local",
  "aws-kms",
  "gcp-kms",
  ...SmartBackendWalletTypes,
] as const;

export type SmartBackendWalletType = (typeof SmartBackendWalletTypes)[number];
export type BackendWalletType = (typeof BackendWalletTypes)[number];
export type ParsedWalletDetails = z.infer<typeof walletDetailsSchema>;

/**
 * Return the wallet details for the given address.
 *
 * If the wallet is an AWS KMS wallet, the AWS KMS secret access key is decrypted.
 *
 * If the wallet is a GCP KMS wallet, the GCP KMS application credential private key is decrypted.
 *
 * If any required parameter cannot be resolved from either the configuration or the overrides, an error is thrown.
 *
 * If the wallet is not found, an error is thrown.
 */
export const getWalletDetails = async ({
  pgtx,
  address,
}: GetWalletDetailsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const config = await getConfig();

  const walletDetails = await prisma.walletDetails.findUnique({
    where: {
      address: address.toLowerCase(),
    },
  });

  if (!walletDetails) {
    throw new WalletDetailsError(
      `No wallet details found for address ${address}`,
    );
  }

  // handle AWS KMS wallets
  if (
    walletDetails.type === "aws-kms" ||
    walletDetails.type === "smart:aws-kms"
  ) {
    if (!walletDetails.awsKmsArn) {
      throw new WalletDetailsError(
        `AWS KMS ARN is missing for the wallet with address ${address}`,
      );
    }

    walletDetails.awsKmsSecretAccessKey = walletDetails.awsKmsSecretAccessKey
      ? decryptWithCustomPassword(walletDetails.awsKmsSecretAccessKey, env.ENCRYPTION_PASSWORD)
      : (config.walletConfiguration.aws?.awsSecretAccessKey ?? null);

    walletDetails.awsKmsAccessKeyId =
      walletDetails.awsKmsAccessKeyId ??
      config.walletConfiguration.aws?.awsAccessKeyId ??
      null;
  }

  // handle GCP KMS wallets
  if (
    walletDetails.type === "gcp-kms" ||
    walletDetails.type === "smart:gcp-kms"
  ) {
    if (!walletDetails.gcpKmsResourcePath) {
      throw new WalletDetailsError(
        `GCP KMS resource path is missing for the wallet with address ${address}`,
      );
    }

    walletDetails.gcpApplicationCredentialPrivateKey =
      walletDetails.gcpApplicationCredentialPrivateKey
        ? decryptWithCustomPassword(
            walletDetails.gcpApplicationCredentialPrivateKey,
            env.ENCRYPTION_PASSWORD,
          )
        : (config.walletConfiguration.gcp?.gcpApplicationCredentialPrivateKey ??
          null);

    walletDetails.gcpApplicationCredentialEmail =
      walletDetails.gcpApplicationCredentialEmail ??
      config.walletConfiguration.gcp?.gcpApplicationCredentialEmail ??
      null;
  }

  // zod schema can validate all necessary fields are populated after decryption
  try {
    return walletDetailsSchema.parse(walletDetails, {
      errorMap: (issue) => {
        const fieldName = issue.path.join(".");
        return {
          message: `${fieldName} is necessary for wallet ${address} of type ${walletDetails.type}, but not found in wallet details or configuration`,
        };
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new WalletDetailsError(
        e.errors.map((error) => error.message).join(", "),
      );
    }
    throw e;
  }
};

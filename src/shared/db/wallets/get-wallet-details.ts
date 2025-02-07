import LRUMap from "mnemonist/lru-map";
import { getAddress } from "thirdweb";
import { z } from "zod";
import type { PrismaTransaction } from "../../schemas/prisma";
import { getConfig } from "../../utils/cache/get-config";
import { decrypt } from "../../utils/crypto";
import { env } from "../../utils/env";
import { getPrismaWithPostgresTx } from "../client";

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

/**
 * Use the Zod schema to validate the EVM address.
 * Uses getAddress from thirdweb/utils to validate the address.
 */
const zodEvmAddressSchema = z.string().transform((address, ctx) => {
  try {
    return getAddress(address);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid EVM address format",
    });
    return z.NEVER;
  }
});

const baseWalletPartialSchema = z.object({
  address: zodEvmAddressSchema,
  label: z.string().nullable(),
});

const smartWalletPartialSchema = z.object({
  accountSignerAddress: zodEvmAddressSchema,
  accountFactoryAddress: zodEvmAddressSchema.nullable(),
  entrypointAddress: zodEvmAddressSchema.nullable(),
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
  .merge(smartWalletPartialSchema);

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
  .merge(smartWalletPartialSchema);

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
  .merge(smartWalletPartialSchema);

const circleWalletSchema = z
  .object({
    type: z.literal("circle"),
    platformIdentifiers: z.object({
      circleWalletId: z.string(),
      walletSetId: z.string(),
      isTestnet: z.boolean(),
    }),
    credentialId: z.string(),
  })
  .merge(baseWalletPartialSchema);

const smartCircleWalletSchema = circleWalletSchema
  .extend({
    type: z.literal("smart:circle"),
  })
  .merge(smartWalletPartialSchema);

const walletDetailsSchema = z.discriminatedUnion("type", [
  localWalletSchema,
  smartLocalWalletSchema,
  awsKmsWalletSchema,
  smartAwsKmsWalletSchema,
  gcpKmsWalletSchema,
  smartGcpKmsWalletSchema,
  circleWalletSchema,
  smartCircleWalletSchema,
]);

export type SmartBackendWalletDetails =
  | z.infer<typeof smartLocalWalletSchema>
  | z.infer<typeof smartAwsKmsWalletSchema>
  | z.infer<typeof smartGcpKmsWalletSchema>
  | z.infer<typeof smartCircleWalletSchema>;

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
  "smart:circle",
] as const;

export const BackendWalletTypes = [
  "local",
  "aws-kms",
  "gcp-kms",
  "circle",
  ...SmartBackendWalletTypes,
] as const;

export type SmartBackendWalletType = (typeof SmartBackendWalletTypes)[number];
export type BackendWalletType = (typeof BackendWalletTypes)[number];
export type ParsedWalletDetails = z.infer<typeof walletDetailsSchema>;

export const walletDetailsCache = new LRUMap<string, ParsedWalletDetails>(2048);
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
  address: _walletAddress,
}: GetWalletDetailsParams) => {
  const walletAddress = _walletAddress.toLowerCase();
  const cachedDetails = walletDetailsCache.get(walletAddress);
  if (cachedDetails) {
    return cachedDetails;
  }

  const prisma = getPrismaWithPostgresTx(pgtx);
  const config = await getConfig();

  const walletDetails = await prisma.walletDetails.findUnique({
    where: {
      address: walletAddress.toLowerCase(),
    },
  });

  if (!walletDetails) {
    throw new WalletDetailsError(
      `No wallet details found for address ${walletAddress}`,
    );
  }

  // handle AWS KMS wallets
  if (
    walletDetails.type === "aws-kms" ||
    walletDetails.type === "smart:aws-kms"
  ) {
    if (!walletDetails.awsKmsArn) {
      throw new WalletDetailsError(
        `AWS KMS ARN is missing for the wallet with address ${walletAddress}`,
      );
    }

    walletDetails.awsKmsSecretAccessKey = walletDetails.awsKmsSecretAccessKey
      ? decrypt(walletDetails.awsKmsSecretAccessKey, env.ENCRYPTION_PASSWORD)
      : config.walletConfiguration.aws?.awsSecretAccessKey ?? null;

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
        `GCP KMS resource path is missing for the wallet with address ${walletAddress}`,
      );
    }

    walletDetails.gcpApplicationCredentialPrivateKey =
      walletDetails.gcpApplicationCredentialPrivateKey
        ? decrypt(
            walletDetails.gcpApplicationCredentialPrivateKey,
            env.ENCRYPTION_PASSWORD,
          )
        : config.walletConfiguration.gcp?.gcpApplicationCredentialPrivateKey ??
          null;

    walletDetails.gcpApplicationCredentialEmail =
      walletDetails.gcpApplicationCredentialEmail ??
      config.walletConfiguration.gcp?.gcpApplicationCredentialEmail ??
      null;
  }

  // zod schema can validate all necessary fields are populated after decryption
  try {
    const result = walletDetailsSchema.parse(walletDetails, {
      errorMap: (issue) => {
        const fieldName = issue.path.join(".");
        return {
          message: `${fieldName} is necessary for wallet ${walletAddress} of type ${walletDetails.type}, but not found in wallet details or configuration`,
        };
      },
    });
    walletDetailsCache.set(walletAddress, result);
    return result;
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new WalletDetailsError(
        e.errors.map((error) => error.message).join(", "),
      );
    }
    throw e;
  }
};

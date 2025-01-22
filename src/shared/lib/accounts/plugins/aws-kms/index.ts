import * as z from "zod";

import { defineAccountPlugin } from "../../account-service";
import { KMSClient, CreateKeyCommand } from "@aws-sdk/client-kms";
import { getAwsKmsAccount } from "./get-aws-kms-account";
import { decrypt } from "../../../../utils/crypto";

const awsKmsCredentialSchema = z.object({
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
});

const awsKmsLegacyConfigSchema = z.object({
  awsAccessKeyId: z.string().nullable(),
  awsSecretAccessKey: z.string().nullable(),
  awsRegion: z.string().nullable(),
});

type AwsKmsLegacyConfig = z.infer<typeof awsKmsLegacyConfigSchema>;
type AwsKmsCredential = z.infer<typeof awsKmsCredentialSchema>;

// AWS KMS Plugin Definition
export const awsKmsPlugin = defineAccountPlugin({
  type: "aws-kms",
  schemas: {
    config: z.object({
      region: z.string().nullable(),
    }),
    legacyConfig: z.object({
      awsAccessKeyId: z.string().nullable(),
      awsSecretAccessKey: z.string().nullable(),
      awsRegion: z.string().nullable(),
    }),
    platformIdentifiers: z.object({
      awsKmsArn: z.string(),
    }),
    credentialData: {
      schema: awsKmsCredentialSchema,
      encryptedKeys: ["secretAccessKey"],
    },
    create: z.object({
      label: z.string(),
      credentialId: z.string().optional(),
      region: z.string().optional(),
    }),
  },
  implementation: {
    async provisionAccount({
      config,
      input,
      credential,
      legacyConfig,
      client: thirdwebClient,
    }) {
      const credentials = resolveAwsCredentials(credential, legacyConfig);
      const region =
        input.region ?? config.region ?? legacyConfig.awsRegion ?? null;

      if (!region) {
        throw new Error("No AWS region provided");
      }

      const client = new KMSClient({
        region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });

      const res = await client.send(
        new CreateKeyCommand({
          Description: "thirdweb Engine AWS KMS Backend Wallet",
          KeyUsage: "SIGN_VERIFY",
          KeySpec: "ECC_SECG_P256K1",
          MultiRegion: false,
        }),
      );

      if (!res.KeyMetadata?.Arn) {
        throw new Error("Failed to create AWS KMS key");
      }

      const awsKmsArn = res.KeyMetadata.Arn;
      const { keyId } = splitAwsKmsArn(awsKmsArn);

      const account = await getAwsKmsAccount({
        client: thirdwebClient,
        keyId,
        config: {
          region,
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
          },
        },
      });

      return {
        account,
        platformIdentifiers: { awsKmsArn },
      };
    },

    async getAccount({
      legacyConfig,
      platformIdentifiers,
      legacyFields,
      client: thirdwebClient,
      credential,
    }) {
      // Handle both modern and legacy cases
      const awsKmsArn =
        platformIdentifiers?.awsKmsArn ?? legacyFields?.awsKmsArn;

      if (!awsKmsArn) {
        throw new Error("No AWS KMS ARN found");
      }

      const { keyId } = splitAwsKmsArn(awsKmsArn);

      // Use either modern credentials or legacy fields
      const credentials = resolveAwsCredentials(credential, {
        awsAccessKeyId:
          legacyFields.awsKmsAccessKeyId ?? legacyConfig.awsAccessKeyId,
        awsSecretAccessKey:
          legacyFields.awsKmsSecretAccessKey ?? legacyConfig.awsSecretAccessKey,
      });

      const account = await getAwsKmsAccount({
        client: thirdwebClient,
        keyId,
        config: {
          region: splitAwsKmsArn(awsKmsArn).region,
          credentials,
        },
      });

      return account;
    },
  },
});

// Helper functions
function resolveAwsCredentials(
  credential: AwsKmsCredential | undefined,
  legacyConfig: Omit<AwsKmsLegacyConfig, "awsRegion">,
) {
  // non-legacy credentials are already decrypted
  if (credential) return credential;

  if (legacyConfig.awsAccessKeyId && legacyConfig.awsSecretAccessKey) {
    return {
      accessKeyId: legacyConfig.awsAccessKeyId,
      secretAccessKey: decrypt(legacyConfig.awsSecretAccessKey),
    };
  }

  throw new Error("No valid AWS credentials found");
}

/**
 * Split an AWS KMS ARN into its parts.
 */
export function splitAwsKmsArn(arn: string) {
  // arn:aws:kms:<region>:<account-id>:key/<key-id>
  const parts = arn.split(":");
  if (parts.length < 6) {
    throw new Error("Invalid AWS KMS ARN");
  }

  const keyId = parts[5].split("/")[1];
  if (!keyId) {
    throw new Error("Invalid AWS KMS ARN");
  }
  const keyIdExtension = parts.slice(6).join(":");

  return {
    region: parts[3],
    accountId: parts[4],
    keyId: `${keyId}${keyIdExtension ? `:${keyIdExtension}` : ""}`,
  };
}

/**
 * Get an AWS KMS ARN from its parts.
 */
export function getAwsKmsArn(options: {
  region: string;
  accountId: string;
  keyId: string;
}) {
  return `arn:aws:kms:${options.region}:${options.accountId}:key/${options.keyId}`;
}

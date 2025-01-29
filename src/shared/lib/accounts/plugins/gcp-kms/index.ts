import { z } from "zod";
import { defineAccountPlugin } from "../../account-service";
import { decrypt } from "../../../../utils/crypto";
import { KeyManagementServiceClient } from "@google-cloud/kms";
import { getGcpKmsAccount } from "./get-gcp-kms-account";

const gcpKmsCredentialSchema = z.object({
  email: z.string(),
  privateKey: z.string(),
});

const gcpKmsLegacyConfigSchema = z.object({
  gcpApplicationProjectId: z.string().nullable(),
  gcpKmsLocationId: z.string().nullable(),
  gcpKmsKeyRingId: z.string().nullable(),
  gcpApplicationCredentialEmail: z.string().nullable(),
  gcpApplicationCredentialPrivateKey: z.string().nullable(),
});

type GcpKmsLegacyConfig = z.infer<typeof gcpKmsLegacyConfigSchema>;
type GcpKmsCredential = z.infer<typeof gcpKmsCredentialSchema>;

export const gcpKmsPlugin = defineAccountPlugin({
  type: "gcp-kms",
  schemas: {
    config: z.object({
      projectId: z.string(),
      locationId: z.string(),
      keyRingId: z.string(),
    }),
    legacyConfig: gcpKmsLegacyConfigSchema,
    platformIdentifiers: z.object({
      gcpKmsResourcePath: z.string(),
    }),
    credentialData: {
      schema: gcpKmsCredentialSchema,
      encryptedKeys: ["privateKey"],
    },
    create: z.object({
      label: z.string(),
      credentialId: z.string().optional(),
      projectId: z.string().optional(),
      locationId: z.string().optional(),
      keyRingId: z.string().optional(),
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
      const credentials = resolveGcpCredentials(credential, legacyConfig);

      const projectId = input.projectId ?? config.projectId;
      const locationId = input.locationId ?? config.locationId;
      const keyRingId = input.keyRingId ?? config.keyRingId;

      if (!projectId || !locationId || !keyRingId) {
        throw new Error(
          "GCP KMS project ID, location ID, and key ring ID are required configuration for this wallet type, but not found in configuration or input",
        );
      }

      const client = new KeyManagementServiceClient({
        credentials: {
          client_email: credentials.email,
          private_key: credentials.privateKey.split(String.raw`\n`).join("\n"),
        },
        projectId: projectId,
      });

      // TODO: What should we set this to?
      const cryptoKeyId = `ec-web3api-${new Date().getTime()}`;
      const [key] = await client.createCryptoKey({
        parent: client.keyRingPath(projectId, locationId, keyRingId),
        cryptoKeyId,
        cryptoKey: {
          purpose: "ASYMMETRIC_SIGN",
          versionTemplate: {
            algorithm: "EC_SIGN_SECP256K1_SHA256",
            protectionLevel: "HSM",
          },
        },
      });

      await client.close();

      const resourcePath = getGcpKmsResourcePath({
        projectId,
        locationId,
        keyRingId,
        cryptoKeyId,
        versionId: "1",
      });

      if (`${key.name}/cryptoKeyVersions/1` !== resourcePath) {
        throw new Error(
          `Expected created key resource path to be ${resourcePath}, but got ${key.name}`,
        );
      }

      const account = await getGcpKmsAccount({
        client: thirdwebClient,
        name: resourcePath,
        clientOptions: {
          credentials: {
            client_email: credentials.email,
            private_key: credentials.privateKey,
          },
        },
      });

      return {
        account,
        platformIdentifiers: {
          gcpKmsResourcePath: resourcePath,
        },
      };
    },
    async getAccount({
      client: thirdwebClient,
      platformIdentifiers,
      credential,
      legacyConfig,
      legacyFields,
    }) {
      const credentials = resolveGcpCredentials(credential, {
        gcpApplicationCredentialEmail:
          legacyFields.gcpApplicationCredentialEmail ??
          legacyConfig.gcpApplicationCredentialEmail,
        gcpApplicationCredentialPrivateKey:
          legacyFields.gcpApplicationCredentialPrivateKey ??
          legacyConfig.gcpApplicationCredentialPrivateKey,
      });

      const resourcePath =
        platformIdentifiers?.gcpKmsResourcePath ??
        legacyFields?.gcpKmsResourcePath;

      if (!resourcePath) {
        throw new Error(
          `Missing GCP KMS resource path on account ${platformIdentifiers} ${legacyFields}`,
        );
      }

      const account = await getGcpKmsAccount({
        client: thirdwebClient,
        name: resourcePath,
        clientOptions: {
          credentials: {
            client_email: credentials.email,
            private_key: credentials.privateKey,
          },
        },
      });

      return account;
    },
  },
});

// Helper functions
function resolveGcpCredentials(
  credential: GcpKmsCredential | undefined,
  legacyConfig: Omit<
    GcpKmsLegacyConfig,
    "gcpApplicationProjectId" | "gcpKmsLocationId" | "gcpKmsKeyRingId"
  >,
) {
  // non-legacy credentials are already decrypted
  if (credential) return credential;

  if (
    legacyConfig.gcpApplicationCredentialEmail &&
    legacyConfig.gcpApplicationCredentialPrivateKey
  ) {
    return {
      email: legacyConfig.gcpApplicationCredentialEmail,
      privateKey: decrypt(legacyConfig.gcpApplicationCredentialPrivateKey),
    };
  }

  throw new Error("No valid GCP credentials found");
}

/**
 * Split a GCP KMS resource path into its parts.
 */
export function splitGcpKmsResourcePath(resourcePath: string) {
  const parts = resourcePath.split("/");

  if (parts.length < 9) {
    throw new Error("Invalid GCP KMS resource path");
  }

  return {
    projectId: parts[1],
    locationId: parts[3],
    keyRingId: parts[5],
    cryptoKeyId: parts[7],
    versionId: parts[9],
  };
}

/**
 *  Get a GCP KMS resource path from its parts.
 */
export function getGcpKmsResourcePath(options: {
  locationId: string;
  keyRingId: string;
  cryptoKeyId: string;
  versionId: string;
  projectId: string;
}) {
  return `projects/${options.projectId}/locations/${options.locationId}/keyRings/${options.keyRingId}/cryptoKeys/${options.cryptoKeyId}/cryptoKeyVersions/${options.versionId}`;
}

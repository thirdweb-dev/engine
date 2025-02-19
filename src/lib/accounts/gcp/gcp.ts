import * as z from "zod";
import type { GcpKmsErr } from "../../errors";
import type { ThirdwebClient } from "thirdweb";
import { err, ok, ResultAsync, safeTry } from "neverthrow";
import type { Account } from "thirdweb/wallets";
import { KeyManagementServiceClient } from "@google-cloud/kms";
import { getGcpKmsAccount } from "./get-gcp-account";
import { baseAccountCreateSchema, baseCredentialIdSchema } from "../base-schemas";

const type = z.literal("gcp-kms");

export const gcpPlatformIdentifiersSchema = z.object({
  platformIdentifiers: z.object({
    gcpKmsResourcePath: z.string().openapi({
      description: "The resource path of the GCP KMS key",
      example:
        "projects/123456789012/locations/global/keyRings/keyring-123456789012/cryptoKeys/key-123456789012",
    }),
  }),
  type,
});

export const gcpAccountCreateParamsSchema = z
  .object({ type })
  .merge(baseAccountCreateSchema)
  .merge(baseCredentialIdSchema);

export const gcpAccountCredentialSchema = z.object({
  email: z.string().email().openapi({
    description: "The email address of the GCP account",
    example: "user@example.com",
  }),
  privateKey: z.string().openapi({
    description: "The private key of the GCP account",
    example:
      "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/5/9+9/8/7/6/5/4/3/2/1/0\n...",
  }),
  type,
});

export const gcpAccountConfigSchema = z.object({
  projectId: z.string().openapi({
    description: "The project ID of the GCP account",
    example: "123456789012",
  }),
  locationId: z.string().openapi({
    description: "The location ID of the GCP account",
    example: "global",
  }),
  keyRingId: z.string().openapi({
    description: "The key ring ID of the GCP account",
    example: "keyring-123456789012",
  }),
  type,
});

type GcpApiError = {
  code?: number;
  details?: string;
  message?: string;
  status?: string;
};

const isGcpApiError = (error: unknown): error is GcpApiError => {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "status" in error)
  );
};

export const mapGcpError = (
  error: unknown,
  code: GcpKmsErr["code"],
  defaultMessage: string,
): GcpKmsErr => {
  if (isGcpApiError(error)) {
    const statusCode = error.code ?? 500;

    // Map GCP error codes to our error codes
    const mappedCode: GcpKmsErr["code"] =
      error.status === "PERMISSION_DENIED"
        ? "unauthorized"
        : error.status === "RESOURCE_EXHAUSTED"
        ? "rate_limit_exceeded"
        : error.status === "FAILED_PRECONDITION"
        ? "invalid_key_state"
        : code;

    return {
      kind: "gcp_kms",
      code: mappedCode,
      status: statusCode,
      message: error.message ?? defaultMessage,
      source: error,
    } as GcpKmsErr;
  }

  return {
    kind: "gcp_kms",
    code,
    status: 500,
    message: error instanceof Error ? error.message : defaultMessage,
    source: error instanceof Error ? error : undefined,
  };
};

export function provisionGcpKmsAccount({
  config,
  credentials,
  client: thirdwebClient,
}: {
  params: z.infer<typeof gcpAccountCreateParamsSchema>;
  config: z.infer<typeof gcpAccountConfigSchema>;
  credentials: z.infer<typeof gcpAccountCredentialSchema>;
  client: ThirdwebClient;
}): ResultAsync<
  {
    account: Account;
    platformIdentifiers: z.infer<
      typeof gcpPlatformIdentifiersSchema
    >["platformIdentifiers"];
  },
  GcpKmsErr
> {
  return safeTry(async function* () {
    const kmsClient = new KeyManagementServiceClient({
      credentials: {
        client_email: credentials.email,
        private_key: credentials.privateKey.split(String.raw`\n`).join("\n"),
      },
      projectId: config.projectId,
    });

    const cryptoKeyId = `ec-web3api-${new Date().getTime()}`;
    const keyResponse = yield* ResultAsync.fromPromise(
      kmsClient.createCryptoKey({
        parent: kmsClient.keyRingPath(
          config.projectId,
          config.locationId,
          config.keyRingId,
        ),
        cryptoKeyId,
        cryptoKey: {
          purpose: "ASYMMETRIC_SIGN",
          versionTemplate: {
            algorithm: "EC_SIGN_SECP256K1_SHA256",
            protectionLevel: "HSM",
          },
        },
      }),
      (error) =>
        mapGcpError(
          error,
          "key_creation_failed",
          "Failed to create GCP KMS key",
        ),
    );

    const [key] = keyResponse;

    const resourcePath = getGcpKmsResourcePath({
      projectId: config.projectId,
      locationId: config.locationId,
      keyRingId: config.keyRingId,
      cryptoKeyId,
      versionId: "1",
    });

    if (`${key.name}/cryptoKeyVersions/1` !== resourcePath) {
      return err({
        kind: "gcp_kms",
        code: "key_creation_failed",
        status: 500,
        message: `Expected created key resource path to be ${resourcePath}, but got ${key.name}`,
      } as GcpKmsErr);
    }

    yield* ResultAsync.fromPromise(kmsClient.close(), (error) =>
      mapGcpError(error, "client_error", "Failed to close KMS client"),
    );

    const account = yield* getGcpKmsAccount({
      client: thirdwebClient,
      name: resourcePath,
      clientOptions: {
        credentials: {
          client_email: credentials.email,
          private_key: credentials.privateKey,
        },
      },
    });

    return ok({
      account,
      platformIdentifiers: {
        gcpKmsResourcePath: resourcePath,
      },
    });
  });
}

/**
 * Split a GCP KMS resource path into its parts.
 */
export function splitGcpKmsResourcePath(resourcePath: string) {
  const parts = resourcePath.split("/");

  if (parts.length < 9) {
    throw new Error("Invalid GCP KMS resource path");
  }

  const projectId = parts[1];
  const locationId = parts[3];
  const keyRingId = parts[5];
  const cryptoKeyId = parts[7];
  const versionId = parts[9];

  if (!projectId || !locationId || !keyRingId || !cryptoKeyId || !versionId) {
    throw new Error("Invalid GCP KMS resource path");
  }

  return {
    projectId,
    locationId,
    keyRingId,
    cryptoKeyId,
    versionId,
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

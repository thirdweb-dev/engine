import * as z from "zod";
import { err, ok, ResultAsync, safeTry } from "neverthrow";
import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import type { Account } from "thirdweb/wallets";
import type { ThirdwebClient } from "thirdweb";
import type { AwsKmsErr } from "../../errors";
import { getAwsKmsAccount } from "./get-aws-account";
import {
  baseAccountCreateSchema,
  baseCredentialIdSchema,
} from "../base-schemas";

const type = z.literal("aws-kms");

export const awsPlatformIdentifiersSchema = z.object({
  platformIdentifiers: z.object({
    awsKmsArn: z.string().openapi({
      description: "The ARN of the AWS KMS key",
      example:
        "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
    }),
  }),
  type,
});

export const awsAccountCreateParamsSchema = z
  .object({ type })
  .merge(baseAccountCreateSchema)
  .merge(baseCredentialIdSchema);

export const awsAccountCredentialSchema = z.object({
  accessKeyId: z.string().openapi({
    description: "The access key ID of the AWS account",
    example: "AKIA1234567890123456",
  }),
  secretAccessKey: z.string().openapi({
    description: "The secret access key of the AWS account",
    example: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  }),
  type,
});

export const awsAccountConfigSchema = z.object({
  region: z.string().openapi({
    description: "The default AWS region of the AWS account",
    example: "us-east-1",
  }),
  type,
});

type ApiError = {
  name?: string;
  message?: string;
  Code?: string;
  $metadata?: {
    httpStatusCode?: number;
  };
};

const isAwsApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === "object" &&
    error !== null &&
    ("Code" in error || "$metadata" in error)
  );
};

export const mapAwsError = (
  error: unknown,
  code: AwsKmsErr["code"],
  defaultMessage: string,
): AwsKmsErr => {
  if (isAwsApiError(error)) {
    const statusCode = error.$metadata?.httpStatusCode ?? 500;
    const errorCode = error.Code;

    // Map AWS error codes to our error codes
    const mappedCode: AwsKmsErr["code"] =
      errorCode === "UnauthorizedException"
        ? "unauthorized"
        : errorCode === "ThrottlingException"
        ? "rate_limit_exceeded"
        : errorCode === "KMSInvalidStateException"
        ? "invalid_key_state"
        : code;

    return {
      kind: "aws_kms",
      code: mappedCode,
      status: statusCode,
      message: error.message ?? defaultMessage,
      source: error,
    } as AwsKmsErr;
  }

  return {
    kind: "aws_kms",
    code,
    status: 500,
    message: error instanceof Error ? error.message : defaultMessage,
    source: error instanceof Error ? error : undefined,
  };
};

export function provisionAwsKmsAccount({
  config,
  credentials,
  client: thirdwebClient,
}: {
  params: z.infer<typeof awsAccountCreateParamsSchema>;
  config: z.infer<typeof awsAccountConfigSchema>;
  credentials: z.infer<typeof awsAccountCredentialSchema>;
  client: ThirdwebClient;
}): ResultAsync<
  {
    account: Account;
    platformIdentifiers: z.infer<
      typeof awsPlatformIdentifiersSchema
    >["platformIdentifiers"];
  },
  AwsKmsErr
> {
  return safeTry(async function* () {
    const kmsClient = new KMSClient({
      region: config.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    const keyResponse = yield* ResultAsync.fromPromise(
      kmsClient.send(
        new CreateKeyCommand({
          Description: "thirdweb Engine AWS KMS Backend Wallet",
          KeyUsage: "SIGN_VERIFY",
          KeySpec: "ECC_SECG_P256K1",
          MultiRegion: false,
        }),
      ),
      (error) =>
        mapAwsError(
          error,
          "key_creation_failed",
          "Failed to create AWS KMS key",
        ),
    );

    if (!keyResponse.KeyMetadata?.Arn) {
      return err({
        kind: "aws_kms",
        code: "key_creation_failed",
        status: 500,
        message: "Failed to create AWS KMS key - no ARN returned",
      } as AwsKmsErr);
    }

    const awsKmsArn = keyResponse.KeyMetadata.Arn;
    const { keyId } = splitAwsKmsArn(awsKmsArn);

    const account = yield* getAwsKmsAccount({
      client: thirdwebClient,
      keyId,
      config: {
        region: config.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      },
    });

    return ok({
      account,
      platformIdentifiers: { awsKmsArn },
    });
  });
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

  const keyIdPart = parts[5];
  if (!keyIdPart) {
    throw new Error("Invalid AWS KMS ARN");
  }

  const keyId = keyIdPart.split("/")[1];
  if (!keyId) {
    throw new Error("Invalid AWS KMS ARN");
  }
  const keyIdExtension = parts.slice(6).join(":");

  const region = parts[3];
  const accountId = parts[4];

  if (!region || !accountId) {
    throw new Error("Invalid AWS KMS ARN");
  }

  return {
    region,
    accountId,
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

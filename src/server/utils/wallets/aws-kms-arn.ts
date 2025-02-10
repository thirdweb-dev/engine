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

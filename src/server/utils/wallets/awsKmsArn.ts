/**
 * Split an AWS KMS ARN into its parts.
 */
export function splitAwsKmsArn(arn: string) {
  // arn:aws:kms:<region>:<account-id>:key/<key-id>
  const parts = arn.split(":");
  const keyId = parts[parts.length - 1].split("/")[1];

  if (!keyId) {
    throw new Error("Invalid AWS KMS ARN");
  }

  if (parts.length < 6) {
    throw new Error("Invalid AWS KMS ARN");
  }

  return {
    region: parts[3],
    accountId: parts[4],
    keyId,
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

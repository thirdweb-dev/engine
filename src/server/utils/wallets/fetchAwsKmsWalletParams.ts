import { getConfig } from "../../../utils/cache/getConfig";

export type AwsKmsWalletParams = {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;

  awsRegion: string;
};

/**
 * Fetches the AWS KMS wallet creation parameters from the configuration or overrides.
 * If any required parameter cannot be resolved from either the configuration or the overrides, an error is thrown.
 */
export async function fetchAwsKmsWalletParams(
  overrides: Partial<AwsKmsWalletParams>,
): Promise<AwsKmsWalletParams> {
  const config = await getConfig();

  const awsAccessKeyId =
    overrides.awsAccessKeyId ?? config.walletConfiguration.aws?.awsAccessKeyId;

  if (!awsAccessKeyId) {
    throw new Error(
      "AWS access key ID is required for this wallet type. Could not find in configuration or params.",
    );
  }

  const awsSecretAccessKey =
    overrides.awsSecretAccessKey ??
    config.walletConfiguration.aws?.awsSecretAccessKey;

  if (!awsSecretAccessKey) {
    throw new Error(
      "AWS secretAccessKey is required for this wallet type. Could not find in configuration or params.",
    );
  }

  const awsRegion =
    overrides.awsRegion ?? config.walletConfiguration.aws?.defaultAwsRegion;

  if (!awsRegion) {
    throw new Error(
      "AWS region is required for this wallet type. Could not find in configuration or params.",
    );
  }

  return {
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion,
  };
}

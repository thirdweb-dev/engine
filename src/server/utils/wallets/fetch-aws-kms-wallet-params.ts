import { getConfig } from "../../../shared/utils/cache/get-config.js";

export type AwsKmsWalletParams = {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;

  awsRegion: string;
};

export class FetchAwsKmsWalletParamsError extends Error {}

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
    throw new FetchAwsKmsWalletParamsError(
      "AWS access key ID is required for this wallet type. Could not find in configuration or params.",
    );
  }

  const awsSecretAccessKey =
    overrides.awsSecretAccessKey ??
    config.walletConfiguration.aws?.awsSecretAccessKey;

  if (!awsSecretAccessKey) {
    throw new FetchAwsKmsWalletParamsError(
      "AWS secretAccessKey is required for this wallet type. Could not find in configuration or params.",
    );
  }

  const awsRegion =
    overrides.awsRegion ?? config.walletConfiguration.aws?.defaultAwsRegion;

  if (!awsRegion) {
    throw new FetchAwsKmsWalletParamsError(
      "AWS region is required for this wallet type. Could not find in configuration or params.",
    );
  }

  return {
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion,
  };
}

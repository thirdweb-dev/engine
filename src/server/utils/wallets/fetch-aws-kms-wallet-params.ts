import { getConfig } from "../../../shared/utils/cache/get-config";

export type AwsKmsWalletParams = {
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;

  awsRegion?: string;
};

export class FetchAwsKmsWalletParamsError extends Error {}

/**
 * Fetches the AWS KMS wallet creation parameters from the configuration or overrides.
 * Credentials are optional - if not provided, AWS SDK will use IAM roles or other credential providers.
 * Only AWS region is required.
 */
export async function fetchAwsKmsWalletParams(
  overrides: Partial<AwsKmsWalletParams>,
): Promise<AwsKmsWalletParams> {
  const config = await getConfig();

  const awsAccessKeyId =
    overrides.awsAccessKeyId ?? config.walletConfiguration.aws?.awsAccessKeyId;

  const awsSecretAccessKey =
    overrides.awsSecretAccessKey ??
    config.walletConfiguration.aws?.awsSecretAccessKey;

  const awsRegion =
    overrides.awsRegion ?? config.walletConfiguration.aws?.defaultAwsRegion;

  return {
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion,
  };
}

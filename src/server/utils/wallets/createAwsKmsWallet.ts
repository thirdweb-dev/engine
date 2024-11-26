import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import {
  type AwsKmsWalletParams,
  FetchAwsKmsWalletParamsError,
  fetchAwsKmsWalletParams,
} from "./fetchAwsKmsWalletParams";
import { importAwsKmsWallet } from "./importAwsKmsWallet";

export type CreateAwsKmsWalletParams = {
  label?: string;
} & Partial<AwsKmsWalletParams>;

export class CreateAwsKmsWalletError extends Error {}

/**
 * Create an AWS KMS wallet, and store it into the database
 * All optional parameters are overrides for the configuration in the database
 * If any required parameter cannot be resolved from either the configuration or the overrides, an error is thrown.
 * Credentials (awsAccessKeyId and awsSecretAccessKey) are explicitly stored separately from the global configuration
 */
export const createAwsKmsWalletDetails = async ({
  label,
  ...overrides
}: CreateAwsKmsWalletParams): Promise<string> => {
  const { awsKmsArn, params } = await createAwsKmsKey(overrides);

  return importAwsKmsWallet({
    awsKmsArn,
    label,
    crendentials: {
      accessKeyId: params.awsAccessKeyId,
      secretAccessKey: params.awsSecretAccessKey,
    },
  });
};

/**
 * Creates an AWS KMS wallet and returns the AWS KMS ARN
 * All optional parameters are overrides for the configuration in the database
 * If any required parameter cannot be resolved from either the configuration or the overrides, an error is thrown.
 */
export const createAwsKmsKey = async (
  partialParams: Partial<AwsKmsWalletParams>,
) => {
  let params: AwsKmsWalletParams;
  try {
    params = await fetchAwsKmsWalletParams(partialParams);
  } catch (e) {
    if (e instanceof FetchAwsKmsWalletParamsError) {
      throw new CreateAwsKmsWalletError(e.message);
    }
    throw e;
  }

  const client = new KMSClient({
    region: params.awsRegion,
    credentials: {
      accessKeyId: params.awsAccessKeyId,
      secretAccessKey: params.awsSecretAccessKey,
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

  return {
    awsKmsArn,
    params: params,
  };
};

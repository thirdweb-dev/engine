import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import {
  FetchAwsKmsWalletParamsError,
  fetchAwsKmsWalletParams,
  type AwsKmsWalletParams,
} from "./fetchAwsKmsWalletParams";
import { importAwsKmsWallet } from "./importAwsKmsWallet";

type CreateAwsKmsWalletParams = {
  label?: string;
} & Partial<AwsKmsWalletParams>;

export class CreateAwsKmsWalletError extends Error {}

/**
 * Create an AWS KMS wallet, and store it into the database
 * All optional parameters are overrides for the configuration in the database
 * If any required parameter cannot be resolved from either the configuration or the overrides, an error is thrown.
 * If credentials (awsAccessKeyId and awsSecretAccessKey) are explicitly provided, they will be stored separately from the global configuration
 */
export const createAwsKmsWallet = async ({
  label,
  ...overrides
}: CreateAwsKmsWalletParams): Promise<string> => {
  let kmsWalletParams: AwsKmsWalletParams;
  try {
    kmsWalletParams = await fetchAwsKmsWalletParams(overrides);
  } catch (e) {
    if (e instanceof FetchAwsKmsWalletParamsError) {
      throw new CreateAwsKmsWalletError(e.message);
    }
    throw e;
  }

  const client = new KMSClient({
    region: kmsWalletParams.awsRegion,
    credentials: {
      accessKeyId: kmsWalletParams.awsAccessKeyId,
      secretAccessKey: kmsWalletParams.awsSecretAccessKey,
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
  return importAwsKmsWallet({
    awsKmsArn,
    label,
    crendentials: {
      accessKeyId: kmsWalletParams.awsAccessKeyId,
      secretAccessKey: kmsWalletParams.awsSecretAccessKey,
    },
  });
};

import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import {
  fetchAwsKmsWalletParams,
  type AwsKmsWalletParams,
} from "./fetchAwsKmsWalletParams";
import { importAwsKmsWallet } from "./importAwsKmsWallet";

type CreateAwsKmsWalletParams = {
  label?: string;
} & Partial<AwsKmsWalletParams>;

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
  const kmsWalletParams = await fetchAwsKmsWalletParams(overrides);

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

  const wereCredentialsOverridden = !!(
    overrides.awsSecretAccessKey && overrides.awsAccessKeyId
  );

  const awsKmsArn = res.KeyMetadata.Arn;
  return importAwsKmsWallet({
    awsKmsArn,
    label,
    crendentials: {
      accessKeyId: kmsWalletParams.awsAccessKeyId,
      secretAccessKey: kmsWalletParams.awsSecretAccessKey,
      shouldStore: wereCredentialsOverridden,
    },
  });
};

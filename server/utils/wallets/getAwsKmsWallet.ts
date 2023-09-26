import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { getDecryptedAWSConfigData } from "../config/getDecryptedAWSConfig";

interface GetAwsKmsWalletParams {
  awsKmsKeyId: string;
}

export const getAwsKmsWallet = async ({
  awsKmsKeyId,
}: GetAwsKmsWalletParams) => {
  // if (env.WALLET_CONFIGURATION.type !== WalletType.awsKms) {
  //   throw new Error(`Server was not configured for AWS KMS wallets.`);
  // }

  /// Read from DB
  // ToDo: cache this
  const awsCreds = await getDecryptedAWSConfigData();

  return new AwsKmsWallet({
    region: awsCreds.awsRegion,
    accessKeyId: awsCreds.awsAccessKey,
    secretAccessKey: awsCreds.awsSecretAccessKey,
    keyId: awsKmsKeyId,
  });
};

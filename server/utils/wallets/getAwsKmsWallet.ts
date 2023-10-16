import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { getConfiguration } from "../../../src/db/configuration/getConfiguration";
import { WalletType } from "../../../src/schema/wallet";

interface GetAwsKmsWalletParams {
  awsKmsKeyId: string;
}

export const getAwsKmsWallet = async ({
  awsKmsKeyId,
}: GetAwsKmsWalletParams) => {
  const config = await getConfiguration();
  if (config.walletConfiguration.type !== WalletType.awsKms) {
    throw new Error(`Server was not configured for AWS KMS wallets.`);
  }

  return new AwsKmsWallet({
    region: config.walletConfiguration.awsRegion,
    accessKeyId: config.walletConfiguration.awsAccessKeyId,
    secretAccessKey: config.walletConfiguration.awsSecretAccessKey,
    keyId: awsKmsKeyId,
  });
};

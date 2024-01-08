import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { WalletType } from "../../../schema/wallet";
import { getConfig } from "../../../utils/cache/getConfig";

interface GetAwsKmsWalletParams {
  awsKmsKeyId: string;
}

export const getAwsKmsWallet = async ({
  awsKmsKeyId,
}: GetAwsKmsWalletParams) => {
  const config = await getConfig();
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

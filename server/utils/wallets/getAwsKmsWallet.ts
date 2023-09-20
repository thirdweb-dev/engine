import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";

interface GetAwsKmsWalletParams {
  awsKmsKeyId: string;
}

export const getAwsKmsWallet = ({ awsKmsKeyId }: GetAwsKmsWalletParams) => {
  if (env.WALLET_CONFIGURATION.type !== WalletType.awsKms) {
    throw new Error(`Server was not configured for AWS KMS wallets.`);
  }

  return new AwsKmsWallet({
    region: env.WALLET_CONFIGURATION.awsRegion,
    accessKeyId: env.WALLET_CONFIGURATION.awsAccessKeyId,
    secretAccessKey: env.WALLET_CONFIGURATION.awsSecretAccessKey,
    keyId: awsKmsKeyId,
  });
};

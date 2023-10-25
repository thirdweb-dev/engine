import { getConfiguration } from "../../../src/db/configuration/getConfiguration";
import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { getAwsKmsWallet } from "./getAwsKmsWallet";

interface ImportAwsKmsWalletParams {
  awsKmsKeyId: string;
  awsKmsArn: string;
  label?: string;
}

export const importAwsKmsWallet = async ({
  awsKmsKeyId,
  awsKmsArn,
  label,
}: ImportAwsKmsWalletParams) => {
  const config = await getConfiguration();
  if (config.walletConfiguration.type !== WalletType.awsKms) {
    throw new Error(`Server was not configured for AWS KMS wallet creation`);
  }

  const wallet = await getAwsKmsWallet({ awsKmsKeyId });

  const walletAddress = await wallet.getAddress();
  await createWalletDetails({
    type: WalletType.awsKms,
    address: walletAddress,
    awsKmsArn,
    awsKmsKeyId,
    label,
  });

  return walletAddress;
};

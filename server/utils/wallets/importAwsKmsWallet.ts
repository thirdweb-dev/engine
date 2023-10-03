import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";
import { getAwsKmsWallet } from "./getAwsKmsWallet";

interface ImportAwsKmsWalletParams {
  awsKmsKeyId: string;
  awsKmsArn: string;
}

export const importAwsKmsWallet = async ({
  awsKmsKeyId,
  awsKmsArn,
}: ImportAwsKmsWalletParams) => {
  if (env.WALLET_CONFIGURATION.type !== WalletType.awsKms) {
    throw new Error(`Server was not configured for AWS KMS wallet creation`);
  }

  const wallet = getAwsKmsWallet({ awsKmsKeyId });

  const walletAddress = await wallet.getAddress();
  await createWalletDetails({
    type: WalletType.awsKms,
    address: walletAddress,
    awsKmsArn,
    awsKmsKeyId,
  });

  return walletAddress;
};

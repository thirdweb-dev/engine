import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { getAwsKmsWallet } from "./getAwsKmsWallet";

interface ImportAwsKmsWalletParams {
  awsKmsKeyId: string;
  awsKmsArn: string;
  alias?: string;
}

export const importAwsKmsWallet = async ({
  awsKmsKeyId,
  awsKmsArn,
  alias,
}: ImportAwsKmsWalletParams) => {
  // if (env.WALLET_CONFIGURATION.type !== WalletType.awsKms) {
  //   throw new Error(`Server was not configured for AWS KMS wallet creation`);
  // }

  const wallet = await getAwsKmsWallet({ awsKmsKeyId });

  const walletAddress = await wallet.getAddress();
  await createWalletDetails({
    type: WalletType.awsKms,
    address: walletAddress,
    awsKmsArn,
    awsKmsKeyId,
    alias,
  });

  return walletAddress;
};

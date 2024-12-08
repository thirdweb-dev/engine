import { createWalletDetails } from "../../../shared/db/wallets/createWalletDetails";
import { WalletType } from "../../../shared/schemas/wallet";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { splitAwsKmsArn } from "./awsKmsArn";
import { getAwsKmsAccount } from "./getAwsKmsAccount";

interface ImportAwsKmsWalletParams {
  awsKmsArn: string;
  crendentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  label?: string;
}

/**
 * Import an AWS KMS wallet, and store it into the database
 */
export const importAwsKmsWallet = async ({
  crendentials,
  awsKmsArn,
  label,
}: ImportAwsKmsWalletParams) => {
  const { keyId, region } = splitAwsKmsArn(awsKmsArn);
  const account = await getAwsKmsAccount({
    client: thirdwebClient,
    keyId,
    config: {
      region,
      credentials: {
        accessKeyId: crendentials.accessKeyId,
        secretAccessKey: crendentials.secretAccessKey,
      },
    },
  });

  const walletAddress = account.address;

  await createWalletDetails({
    type: WalletType.awsKms,
    address: walletAddress,
    awsKmsArn,
    label,

    awsKmsAccessKeyId: crendentials.accessKeyId,
    awsKmsSecretAccessKey: crendentials.secretAccessKey,
  });

  return walletAddress;
};

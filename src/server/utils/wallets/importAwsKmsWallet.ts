import { createWalletDetails } from "../../../db/wallets/createWalletDetails";
import { WalletType } from "../../../schema/wallet";
import { thirdwebClient } from "../../../utils/sdk";
import { splitAwsKmsArn } from "./awsKmsArn";
import { getAwsKmsAccount } from "./getAwsKmsAccount";

interface ImportAwsKmsWalletParams {
  awsKmsArn: string;
  crendentials: {
    accessKeyId: string;
    secretAccessKey: string;
    /**
     * If true, the AWS access key and secret access key will be stored
     * along with the wallet details, separately from the global configuration
     */
    shouldStore?: boolean;
  };
  label?: string;
}

/**
 * Import an AWS KMS wallet, and store it into the database
 *
 * If credentials.shouldStore is true, the AWS access key and secret access key will be stored
 * along with the wallet details, separately from the global configuration
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

    ...(crendentials.shouldStore
      ? {
          awsAccessKeyId: crendentials.accessKeyId,
          awsSecretAccessKey: crendentials.secretAccessKey,
        }
      : {}),
  });

  return walletAddress;
};

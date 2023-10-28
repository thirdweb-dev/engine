import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { getConfiguration } from "../../../db/configuration/getConfiguration";
import { WalletType } from "../../../schema/wallet";
import { importAwsKmsWallet } from "./importAwsKmsWallet";

interface CreateAwsKmsWalletParams {
  label?: string;
}

export const createAwsKmsWallet = async ({
  label,
}: CreateAwsKmsWalletParams): Promise<string> => {
  const config = await getConfiguration();
  if (config.walletConfiguration.type !== WalletType.awsKms) {
    throw new Error(`Server was not configured for AWS KMS wallet creation`);
  }

  const client = new KMSClient({
    region: config.walletConfiguration.awsRegion,
    credentials: {
      accessKeyId: config.walletConfiguration.awsAccessKeyId,
      secretAccessKey: config.walletConfiguration.awsSecretAccessKey,
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

  const awsKmsArn = res.KeyMetadata!.Arn!;
  const awsKmsKeyId = res.KeyMetadata!.KeyId!;

  return importAwsKmsWallet({ awsKmsArn, awsKmsKeyId, label });
};

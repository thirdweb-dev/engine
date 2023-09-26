import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { getDecryptedAWSConfigData } from "../config/getDecryptedAWSConfig";
import { importAwsKmsWallet } from "./importAwsKmsWallet";

export const createAwsKmsWallet = async (): Promise<string> => {
  // if (env.WALLET_CONFIGURATION.type !== WalletType.awsKms) {
  //   throw new Error(`Server was not configured for AWS KMS wallet creation`);
  // }

  /// Read from DB
  // ToDo: cache this
  const awsCreds = await getDecryptedAWSConfigData();

  const client = new KMSClient({
    credentials: {
      accessKeyId: awsCreds.awsAccessKey,
      secretAccessKey: awsCreds.awsSecretAccessKey,
    },
    region: awsCreds.awsRegion,
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

  return importAwsKmsWallet({ awsKmsArn, awsKmsKeyId });
};

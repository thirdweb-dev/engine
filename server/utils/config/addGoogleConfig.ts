import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { Static } from "@sinclair/typebox";
import { env } from "../../../core/env";
import { EngineConfigSchema } from "../../schemas/config";
import { importAwsKmsWallet } from "../wallets/importAwsKmsWallet";

export const addGoogleConfig = async (
  data: Static<typeof EngineConfigSchema>["gcp"],
): Promise<string> => {
  if (
    !data?.google_application_credential_email ||
    !data?.google_application_credential_private_key ||
    !data?.google_application_project_id ||
    !data?.google_kms_key_ring_id ||
    !data?.google_kms_location_id
  ) {
    throw new Error(`Missing Values for Google Config Storage`);
  }

  /// Read from cache or DB

  const client = new KMSClient({
    credentials: {
      accessKeyId: env.WALLET_CONFIGURATION.awsAccessKeyId,
      secretAccessKey: env.WALLET_CONFIGURATION.awsSecretAccessKey,
    },
    region: env.WALLET_CONFIGURATION.awsRegion,
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

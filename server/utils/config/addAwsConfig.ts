import { Static } from "@sinclair/typebox";
import { createConfig } from "../../../src/db/config/createConfig";
import { WalletType } from "../../../src/schema/wallet";
import { AWSConfig, AWSConfigSchema } from "../../schemas/config";
import { encryptText } from "../../utilities/cryptography";

export const addAwsConfig = async (
  data: Static<typeof AWSConfigSchema>[WalletType.awsKms],
) => {
  if (!data?.awsAccessKey || !data?.awsRegion || !data?.awsSecretAccessKey) {
    throw new Error("No data provided for AWS Config Storage");
  }
  const { awsAccessKey, awsRegion, awsSecretAccessKey } = data;

  const encryptedAWSAccessKeyData = encryptText(awsAccessKey);
  const encryptedAWSAccessSecretKeyData = encryptText(awsSecretAccessKey);
  const encryptedAWSRegionData = encryptText(awsRegion);

  const configData: AWSConfig = {
    awsAccessKey: encryptedAWSAccessKeyData.encryptedData,
    awsAccessKeyIV: encryptedAWSAccessKeyData.iv,
    awsAccessKeyAuthTag: encryptedAWSAccessKeyData.authTag,
    awsSecretAccessKey: encryptedAWSAccessSecretKeyData.encryptedData,
    awsSecretAccessKeyIV: encryptedAWSAccessSecretKeyData.iv,
    awsSecretAccessKeyAuthTag: encryptedAWSAccessSecretKeyData.authTag,
    awsRegion: encryptedAWSRegionData.encryptedData,
    awsRegionIV: encryptedAWSRegionData.iv,
    awsRegionAuthTag: encryptedAWSRegionData.authTag,
  };

  return await createConfig({
    awsKms: configData,
    configType: WalletType.awsKms,
  });
};

import { AWSConfig } from "../../schemas/config";
import { decryptText } from "../../utilities/cryptography";

export const getDecryptedAWSConfigData = (configData: AWSConfig) => {
  if (
    !configData.awsAccessKey ||
    !configData.awsAccessKeyIV ||
    !configData.awsAccessKeyAuthTag
  ) {
    throw new Error("Missing AWS Keys");
  }
  const result = {
    awsAccessKey: decryptText({
      encryptedData: configData.awsAccessKey!,
      iv: configData.awsAccessKeyIV!,
      authTag: configData.awsAccessKeyAuthTag!,
    }),
    awsSecretAccessKey: decryptText({
      encryptedData: configData.awsSecretAccessKey!,
      iv: configData.awsSecretAccessKeyIV!,
      authTag: configData.awsSecretAccessKeyAuthTag!,
    }),
    awsRegion: decryptText({
      encryptedData: configData.awsRegion!,
      iv: configData.awsRegionIV!,
      authTag: configData.awsRegionAuthTag!,
    }),
  };

  return result;
};

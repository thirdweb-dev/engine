import { getConfigData } from "../../../src/db/config/getConfigData";
import { WalletType } from "../../../src/schema/wallet";
import { AWSConfig } from "../../schemas/config";
import { decryptText } from "../../utilities/cryptography";

export const getDecryptedAWSConfigData = async (configData?: AWSConfig) => {
  let encryptedCreds;

  if (!configData) {
    encryptedCreds = await getConfigData({
      configType: WalletType.awsKms,
    });
  } else {
    encryptedCreds = configData;
  }

  if (
    !encryptedCreds ||
    !encryptedCreds.awsAccessKey ||
    !encryptedCreds.awsSecretAccessKey ||
    !encryptedCreds.awsRegion ||
    !encryptedCreds.awsAccessKeyIV ||
    !encryptedCreds.awsSecretAccessKeyIV ||
    !encryptedCreds.awsRegionIV ||
    !encryptedCreds.awsAccessKeyAuthTag ||
    !encryptedCreds.awsSecretAccessKeyAuthTag ||
    !encryptedCreds.awsRegionAuthTag
  ) {
    throw new Error(`No AWS KMS configuration found`);
  }

  const result = {
    awsAccessKey: decryptText({
      encryptedData: encryptedCreds.awsAccessKey!,
      iv: encryptedCreds.awsAccessKeyIV!,
      authTag: encryptedCreds.awsAccessKeyAuthTag!,
    }),
    awsSecretAccessKey: decryptText({
      encryptedData: encryptedCreds.awsSecretAccessKey!,
      iv: encryptedCreds.awsSecretAccessKeyIV!,
      authTag: encryptedCreds.awsSecretAccessKeyAuthTag!,
    }),
    awsRegion: decryptText({
      encryptedData: encryptedCreds.awsRegion!,
      iv: encryptedCreds.awsRegionIV!,
      authTag: encryptedCreds.awsRegionAuthTag!,
    }),
  };

  return result;
};

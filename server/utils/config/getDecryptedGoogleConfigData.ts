import { getConfigData } from "../../../src/db/config/getConfigData";
import { WalletType } from "../../../src/schema/wallet";
import { GCPConfig } from "../../schemas/config";
import { decryptText } from "../../utilities/cryptography";

export const getDecryptedGoogleConfigData = async (configData?: GCPConfig) => {
  let encryptedCreds;

  if (!configData) {
    encryptedCreds = await getConfigData({
      configType: WalletType.gcpKms,
    });
  } else {
    encryptedCreds = configData;
  }

  if (
    !encryptedCreds ||
    !encryptedCreds.gcpAppCredentialEmail! ||
    !encryptedCreds.gcpAppCredentialEmailIV ||
    !encryptedCreds.gcpAppCredentialEmailAuthTag ||
    !encryptedCreds.gcpAppCredentialPrivateKey ||
    !encryptedCreds.gcpAppCredentialPrivateKeyIV ||
    !encryptedCreds.gcpAppCredentialPrivateKeyAuthTag ||
    !encryptedCreds.gcpProjectId ||
    !encryptedCreds.gcpProjectIdIV ||
    !encryptedCreds.gcpProjectIdAuthTag ||
    !encryptedCreds.gcpKmsRingId ||
    !encryptedCreds.gcpKmsRingIdIV ||
    !encryptedCreds.gcpKmsRingIdAuthTag ||
    !encryptedCreds.gcpLocationId ||
    !encryptedCreds.gcpLocationIdIV ||
    !encryptedCreds.gcpLocationIdAuthTag
  ) {
    throw new Error("Missing Google Keys");
  }

  const result = {
    gcpAppCredentialEmail: decryptText({
      encryptedData: encryptedCreds.gcpAppCredentialEmail!,
      iv: encryptedCreds.gcpAppCredentialEmailIV!,
      authTag: encryptedCreds.gcpAppCredentialEmailAuthTag!,
    }),
    gcpAppCredentialPrivateKey: decryptText({
      encryptedData: encryptedCreds.gcpAppCredentialPrivateKey!,
      iv: encryptedCreds.gcpAppCredentialPrivateKeyIV!,
      authTag: encryptedCreds.gcpAppCredentialPrivateKeyAuthTag!,
    }),
    gcpProjectId: decryptText({
      encryptedData: encryptedCreds.gcpProjectId!,
      iv: encryptedCreds.gcpProjectIdIV!,
      authTag: encryptedCreds.gcpProjectIdAuthTag!,
    }),
    gcpKmsRingId: decryptText({
      encryptedData: encryptedCreds.gcpKmsRingId!,
      iv: encryptedCreds.gcpKmsRingIdIV!,
      authTag: encryptedCreds.gcpKmsRingIdAuthTag!,
    }),
    gcpLocationId: decryptText({
      encryptedData: encryptedCreds.gcpLocationId!,
      iv: encryptedCreds.gcpLocationIdIV!,
      authTag: encryptedCreds.gcpLocationIdAuthTag!,
    }),
  };

  return result;
};

import { GCPConfig } from "../../schemas/config";
import { decryptText } from "../../utilities/cryptography";

export const getDecryptedGoogleConfigData = (configData: GCPConfig) => {
  if (
    !configData.gcpAppCredentialEmail ||
    !configData.gcpAppCredentialEmailIV ||
    !configData.gcpAppCredentialEmailAuthTag
  ) {
    throw new Error("Missing Google Keys");
  }
  const result = {
    gcpAppCredentialEmail: decryptText({
      encryptedData: configData.gcpAppCredentialEmail!,
      iv: configData.gcpAppCredentialEmailIV!,
      authTag: configData.gcpAppCredentialEmailAuthTag!,
    }),
    gcpAppCredentialPrivateKey: decryptText({
      encryptedData: configData.gcpAppCredentialPrivateKey!,
      iv: configData.gcpAppCredentialPrivateKeyIV!,
      authTag: configData.gcpAppCredentialPrivateKeyAuthTag!,
    }),
    gcpProjectId: decryptText({
      encryptedData: configData.gcpProjectId!,
      iv: configData.gcpProjectIdIV!,
      authTag: configData.gcpProjectIdAuthTag!,
    }),
    gcpKMSRingId: decryptText({
      encryptedData: configData.gcpKmsRingId!,
      iv: configData.gcpKmsRingIdIV!,
      authTag: configData.gcpKmsRingIdAuthTag!,
    }),
    gcpLocationId: decryptText({
      encryptedData: configData.gcpLocationId!,
      iv: configData.gcpLocationIdIV!,
      authTag: configData.gcpLocationIdAuthTag!,
    }),
  };

  return result;
};

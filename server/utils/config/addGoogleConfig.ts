import { Static } from "@sinclair/typebox";
import { createConfig } from "../../../src/db/config/createConfig";
import { WalletType } from "../../../src/schema/wallet";
import { EngineConfigSchema, GCPConfig } from "../../schemas/config";
import { encryptText } from "../../utilities/cryptography";

export const addGoogleConfig = async (
  data: Static<typeof EngineConfigSchema>["gcp"],
) => {
  if (
    !data?.gcpAppCredentialEmail ||
    !data?.gcpAppCredentialPrivateKey ||
    !data?.gcpKmsRingId ||
    !data?.gcpProjectId ||
    !data?.gcpLocationId
  ) {
    throw new Error(`Missing Values for Google Config Storage`);
  }

  const {
    gcpAppCredentialEmail,
    gcpAppCredentialPrivateKey,
    gcpKmsRingId,
    gcpLocationId,
    gcpProjectId,
  } = data;

  const encryptedProjectId = encryptText(gcpProjectId);
  const encryptedEmail = encryptText(gcpAppCredentialEmail);
  const encryptedPrivateKey = encryptText(gcpAppCredentialPrivateKey);
  const encryptedGcpKmsRingId = encryptText(gcpKmsRingId);
  const encryptedLocationId = encryptText(gcpLocationId);

  const configData: GCPConfig = {
    gcpAppCredentialEmail: encryptedEmail.encryptedData,
    gcpAppCredentialEmailIV: encryptedEmail.iv,
    gcpAppCredentialEmailAuthTag: encryptedEmail.authTag,
    gcpAppCredentialPrivateKey: encryptedPrivateKey.encryptedData,
    gcpAppCredentialPrivateKeyIV: encryptedPrivateKey.iv,
    gcpAppCredentialPrivateKeyAuthTag: encryptedPrivateKey.authTag,
    gcpProjectId: encryptedProjectId.encryptedData,
    gcpProjectIdIV: encryptedProjectId.iv,
    gcpProjectIdAuthTag: encryptedProjectId.authTag,
    gcpKmsRingId: encryptedGcpKmsRingId.encryptedData,
    gcpKmsRingIdIV: encryptedGcpKmsRingId.iv,
    gcpKmsRingIdAuthTag: encryptedGcpKmsRingId.authTag,
    gcpLocationId: encryptedLocationId.encryptedData,
    gcpLocationIdIV: encryptedLocationId.iv,
    gcpLocationIdAuthTag: encryptedLocationId.authTag,
  };

  return await createConfig({
    gcpKms: configData,
    configType: WalletType.gcpKms,
  });
};

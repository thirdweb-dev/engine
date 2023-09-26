import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import { getDecryptedGoogleConfigData } from "../config/getDecryptedGoogleConfigData";

interface GetGcpKmsSignerParams {
  gcpKmsKeyId: string;
  gcpKmsKeyVersionId: string;
}

export const getGcpKmsSigner = async ({
  gcpKmsKeyId,
  gcpKmsKeyVersionId,
}: GetGcpKmsSignerParams) => {
  // if (env.WALLET_CONFIGURATION.type !== WalletType.gcpKms) {
  //   throw new Error(`Server was not configured for GCP KMS.`);
  // }

  /// Read from DB
  // ToDo: cache this
  const gcpCreds = await getDecryptedGoogleConfigData();

  return new GcpKmsSigner({
    projectId: gcpCreds.gcpProjectId,
    locationId: gcpCreds.gcpLocationId,
    keyRingId: gcpCreds.gcpKmsRingId,
    keyId: gcpKmsKeyId,
    keyVersion: gcpKmsKeyVersionId,
  });
};

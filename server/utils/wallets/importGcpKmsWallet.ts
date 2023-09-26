import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { getDecryptedGoogleConfigData } from "../config/getDecryptedGoogleConfigData";
import { getGcpKmsSigner } from "./getGcpKmsSigner";

interface ImportGcpKmsWalletParams {
  gcpKmsKeyId: string;
  gcpKmsKeyVersionId: string;
  alias?: string;
}

export const importGcpKmsWallet = async ({
  gcpKmsKeyId,
  gcpKmsKeyVersionId,
  alias,
}: ImportGcpKmsWalletParams) => {
  // if (env.WALLET_CONFIGURATION.type !== WalletType.gcpKms) {
  //   throw new Error(`Server was not configured for GCP KMS wallet creation`);
  // }
  const gcpCreds = await getDecryptedGoogleConfigData();
  const gcpKmsResourcePath = `projects/${gcpCreds.gcpProjectId}/locations/${gcpCreds.gcpLocationId}/keyRings/${gcpCreds.gcpKmsRingId}/cryptoKeys/${gcpKmsKeyId}/cryptoKeysVersion/${gcpKmsKeyVersionId}`;
  const signer = await getGcpKmsSigner({ gcpKmsKeyId, gcpKmsKeyVersionId });

  const walletAddress = await signer.getAddress();
  await createWalletDetails({
    type: WalletType.gcpKms,
    address: walletAddress,
    gcpKmsKeyId: gcpKmsKeyId,
    gcpKmsKeyRingId: gcpCreds.gcpKmsRingId,
    gcpKmsLocationId: gcpCreds.gcpLocationId,
    gcpKmsKeyVersionId: gcpKmsKeyVersionId,
    gcpKmsResourcePath,
    alias,
  });

  return walletAddress;
};

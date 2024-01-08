import { createWalletDetails } from "../../../db/wallets/createWalletDetails";
import { WalletType } from "../../../schema/wallet";
import { getConfig } from "../../../utils/cache/getConfig";
import { getGcpKmsWallet } from "./getGcpKmsWallet";

interface ImportGcpKmsWalletParams {
  gcpKmsKeyId: string;
  gcpKmsKeyVersionId: string;
  label?: string;
}

export const importGcpKmsWallet = async ({
  gcpKmsKeyId,
  gcpKmsKeyVersionId,
  label,
}: ImportGcpKmsWalletParams) => {
  const config = await getConfig();
  if (config.walletConfiguration.type !== WalletType.gcpKms) {
    throw new Error(`Server was not configured for GCP KMS wallet creation`);
  }

  const gcpKmsResourcePath = `projects/${config.walletConfiguration.gcpApplicationProjectId}/locations/${config.walletConfiguration.gcpKmsLocationId}/keyRings/${config.walletConfiguration.gcpKmsKeyRingId}/cryptoKeys/${gcpKmsKeyId}/cryptoKeysVersion/${gcpKmsKeyVersionId}`;
  const wallet = await getGcpKmsWallet({ gcpKmsKeyId, gcpKmsKeyVersionId });

  const walletAddress = await wallet.getAddress();
  await createWalletDetails({
    type: WalletType.gcpKms,
    address: walletAddress,
    label,
    gcpKmsKeyId: gcpKmsKeyId,
    gcpKmsKeyRingId: config.walletConfiguration.gcpKmsKeyRingId,
    gcpKmsLocationId: config.walletConfiguration.gcpKmsLocationId,
    gcpKmsKeyVersionId: gcpKmsKeyVersionId,
    gcpKmsResourcePath,
  });

  return walletAddress;
};

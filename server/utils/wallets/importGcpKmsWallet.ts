import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";
import { getGcpKmsWallet } from "./getGcpKmsWallet";

interface ImportGcpKmsWalletParams {
  gcpKmsKeyId: string;
  gcpKmsKeyVersionId: string;
}

export const importGcpKmsWallet = async ({
  gcpKmsKeyId,
  gcpKmsKeyVersionId,
}: ImportGcpKmsWalletParams) => {
  if (env.WALLET_CONFIGURATION.type !== WalletType.gcpKms) {
    throw new Error(`Server was not configured for GCP KMS wallet creation`);
  }

  const gcpKmsResourcePath = `projects/${env.WALLET_CONFIGURATION.gcpApplicationProjectId}/locations/${env.WALLET_CONFIGURATION.gcpKmsLocationId}/keyRings/${env.WALLET_CONFIGURATION.gcpKmsKeyRingId}/cryptoKeys/${gcpKmsKeyId}/cryptoKeysVersion/${gcpKmsKeyVersionId}`;
  const wallet = getGcpKmsWallet({ gcpKmsKeyId, gcpKmsKeyVersionId });

  const walletAddress = await wallet.getAddress();
  await createWalletDetails({
    type: WalletType.gcpKms,
    address: walletAddress,
    gcpKmsKeyId: gcpKmsKeyId,
    gcpKmsKeyRingId: env.WALLET_CONFIGURATION.gcpKmsKeyRingId,
    gcpKmsLocationId: env.WALLET_CONFIGURATION.gcpKmsLocationId,
    gcpKmsKeyVersionId: gcpKmsKeyVersionId,
    gcpKmsResourcePath,
  });

  return walletAddress;
};

import { createBackendWallet } from "../../../src/db/wallets/createBackendWallet";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";
import { getGcpKmsSigner } from "./getGcpKmsSigner";

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
  const signer = getGcpKmsSigner({ gcpKmsKeyId, gcpKmsKeyVersionId });

  const walletAddress = await signer.getAddress();
  await createBackendWallet({
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

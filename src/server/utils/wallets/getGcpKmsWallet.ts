import { GcpKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/gcp-kms";
import { WalletType } from "../../../schema/wallet";
import { getConfig } from "../../../utils/cache/getConfig";

interface GetGcpKmsWalletParams {
  gcpKmsKeyId: string;
  gcpKmsKeyVersionId: string;
}

export const getGcpKmsWallet = async ({
  gcpKmsKeyId,
  gcpKmsKeyVersionId,
}: GetGcpKmsWalletParams) => {
  const config = await getConfig();
  if (config.walletConfiguration.type !== WalletType.gcpKms) {
    throw new Error(`Server was not configured for GCP KMS.`);
  }

  return new GcpKmsWallet({
    projectId: config.walletConfiguration.gcpApplicationProjectId,
    locationId: config.walletConfiguration.gcpKmsLocationId,
    keyRingId: config.walletConfiguration.gcpKmsKeyRingId,
    keyId: gcpKmsKeyId,
    keyVersion: gcpKmsKeyVersionId,
    applicationCredentialEmail:
      config.walletConfiguration.gcpApplicationCredentialEmail,
    applicationCredentialPrivateKey:
      config.walletConfiguration.gcpApplicationCredentialPrivateKey,
  });
};

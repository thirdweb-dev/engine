import { GcpKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/gcp-kms";
import { getConfiguration } from "../../../src/db/configuration/getConfiguration";
import { WalletType } from "../../../src/schema/wallet";

interface GetGcpKmsWalletParams {
  gcpKmsKeyId: string;
  gcpKmsKeyVersionId: string;
}

export const getGcpKmsWallet = async ({
  gcpKmsKeyId,
  gcpKmsKeyVersionId,
}: GetGcpKmsWalletParams) => {
  const config = await getConfiguration();
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

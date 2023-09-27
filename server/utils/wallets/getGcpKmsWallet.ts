import { GcpKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/gcp-kms";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";

interface GetGcpKmsWalletParams {
  gcpKmsKeyId: string;
  gcpKmsKeyVersionId: string;
}

export const getGcpKmsWallet = ({
  gcpKmsKeyId,
  gcpKmsKeyVersionId,
}: GetGcpKmsWalletParams) => {
  if (env.WALLET_CONFIGURATION.type !== WalletType.gcpKms) {
    throw new Error(`Server was not configured for GCP KMS.`);
  }

  return new GcpKmsWallet({
    projectId: env.WALLET_CONFIGURATION.gcpApplicationProjectId,
    locationId: env.WALLET_CONFIGURATION.gcpKmsLocationId,
    keyRingId: env.WALLET_CONFIGURATION.gcpKmsKeyRingId,
    keyId: gcpKmsKeyId,
    keyVersion: gcpKmsKeyVersionId,
  });
};

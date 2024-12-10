import { createWalletDetails } from "../../../shared/db/wallets/create-wallet-details";
import { WalletType } from "../../../shared/schemas/wallet";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { getGcpKmsAccount } from "./get-gcp-kms-account";

interface ImportGcpKmsWalletParams {
  gcpKmsResourcePath: string;
  label?: string;
  credentials: {
    email: string;
    privateKey: string;
  };
}

/**
 * Import a GCP KMS wallet, and store it into the database
 *
 * If credentials.shouldStore is true, the GCP application credential email and private key will be stored
 * along with the wallet details, separately from the global configuration
 */
export const importGcpKmsWallet = async ({
  label,
  gcpKmsResourcePath,
  credentials,
}: ImportGcpKmsWalletParams) => {
  const account = await getGcpKmsAccount({
    client: thirdwebClient,
    name: gcpKmsResourcePath,
    clientOptions: {
      credentials: {
        client_email: credentials.email,
        private_key: credentials.privateKey,
      },
    },
  });

  const walletAddress = account.address;

  await createWalletDetails({
    type: WalletType.gcpKms,
    address: walletAddress,
    label,
    gcpKmsResourcePath,

    gcpApplicationCredentialEmail: credentials.email,
    gcpApplicationCredentialPrivateKey: credentials.privateKey,
  });

  return walletAddress;
};

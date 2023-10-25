import { KeyManagementServiceClient } from "@google-cloud/kms";
import { getConfiguration } from "../../../src/db/configuration/getConfiguration";
import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { getGcpKmsWallet } from "./getGcpKmsWallet";

interface CreateGcpKmsWallet {
  label?: string;
}

export const createGcpKmsWallet = async ({
  label,
}: CreateGcpKmsWallet): Promise<string> => {
  const config = await getConfiguration();
  if (config.walletConfiguration.type !== WalletType.gcpKms) {
    throw new Error(`Server was not configured for GCP KMS wallet creation`);
  }

  const client = new KeyManagementServiceClient({
    credentials: {
      client_email: config.walletConfiguration.gcpApplicationCredentialEmail,
      private_key: config.walletConfiguration.gcpApplicationCredentialPrivateKey
        .split(String.raw`\n`)
        .join("\n"),
    },
    projectId: config.walletConfiguration.gcpApplicationProjectId,
  });

  // TODO: What should we set this to?
  const cryptoKeyId = `ec-web3api-${new Date().getTime()}`;
  const [key] = await client.createCryptoKey({
    parent: client.keyRingPath(
      config.walletConfiguration.gcpApplicationProjectId,
      config.walletConfiguration.gcpKmsLocationId,
      config.walletConfiguration.gcpKmsKeyRingId,
    ),
    cryptoKeyId,
    cryptoKey: {
      purpose: "ASYMMETRIC_SIGN",
      versionTemplate: {
        algorithm: "EC_SIGN_SECP256K1_SHA256",
        protectionLevel: "HSM",
      },
    },
  });

  await client.close();

  const wallet = await getGcpKmsWallet({
    gcpKmsKeyId: cryptoKeyId,
    gcpKmsKeyVersionId: "1",
  });

  const walletAddress = await wallet.getAddress();
  await createWalletDetails({
    type: WalletType.gcpKms,
    address: walletAddress,
    label,
    gcpKmsKeyId: cryptoKeyId,
    gcpKmsKeyRingId: config.walletConfiguration.gcpKmsKeyRingId,
    gcpKmsLocationId: config.walletConfiguration.gcpKmsLocationId,
    gcpKmsKeyVersionId: "1",
    gcpKmsResourcePath: `${key.name!}/cryptoKeysVersion/1`,
  });

  return walletAddress;
};

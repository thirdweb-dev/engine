import { KeyManagementServiceClient } from "@google-cloud/kms";
import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";
import { getGcpKmsSigner } from "./getGcpKmsSigner";

export const createGcpKmsWallet = async (): Promise<string> => {
  if (env.WALLET_CONFIGURATION.type !== WalletType.gcpKms) {
    throw new Error(`Server was not configured for GCP KMS wallet creation`);
  }

  const client = new KeyManagementServiceClient({
    credentials: {
      client_email: env.WALLET_CONFIGURATION.gcpApplicationCredentialEmail,
      private_key: env.WALLET_CONFIGURATION.gcpApplicationCredentialPrivateKey,
    },
    projectId: env.WALLET_CONFIGURATION.gcpApplicationProjectId,
  });

  // TODO: What should we set this to?
  const cryptoKeyId = `ec-web3api-${new Date().getTime()}`;
  const [key] = await client.createCryptoKey({
    parent: client.keyRingPath(
      env.WALLET_CONFIGURATION.gcpApplicationProjectId,
      env.WALLET_CONFIGURATION.gcpKmsLocationId,
      env.WALLET_CONFIGURATION.gcpKmsKeyRingId,
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

  const signer = getGcpKmsSigner({
    gcpKmsKeyId: cryptoKeyId,
    gcpKmsKeyVersionId: "1",
  });

  const walletAddress = await signer.getAddress();
  await createWalletDetails({
    type: WalletType.gcpKms,
    address: walletAddress,
    gcpKmsKeyId: cryptoKeyId,
    gcpKmsKeyRingId: env.WALLET_CONFIGURATION.gcpKmsKeyRingId,
    gcpKmsLocationId: env.WALLET_CONFIGURATION.gcpKmsLocationId,
    gcpKmsKeyVersionId: "1",
    gcpKmsResourcePath: `${key.name!}/cryptoKeysVersion/1`,
  });

  return walletAddress;
};

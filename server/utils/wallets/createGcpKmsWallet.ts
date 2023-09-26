import { KeyManagementServiceClient } from "@google-cloud/kms";
import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { getDecryptedGoogleConfigData } from "../config/getDecryptedGoogleConfigData";
import { getGcpKmsSigner } from "./getGcpKmsSigner";

export const createGcpKmsWallet = async (alias?: string): Promise<string> => {
  // if (env.WALLET_CONFIGURATION.type !== WalletType.gcpKms) {
  //   throw new Error(`Server was not configured for GCP KMS wallet creation`);
  // }

  /// Read from DB
  // ToDo: cache this
  const gcpCreds = await getDecryptedGoogleConfigData();

  const client = new KeyManagementServiceClient({
    credentials: {
      client_email: gcpCreds.gcpAppCredentialEmail,
      private_key: gcpCreds.gcpAppCredentialPrivateKey,
    },
    projectId: gcpCreds.gcpProjectId,
  });

  // TODO: What should we set this to?
  const cryptoKeyId = `ec-web3api-${new Date().getTime()}`;
  const [key] = await client.createCryptoKey({
    parent: client.keyRingPath(
      gcpCreds.gcpProjectId,
      gcpCreds.gcpKmsRingId,
      gcpCreds.gcpKmsRingId,
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

  const signer = await getGcpKmsSigner({
    gcpKmsKeyId: cryptoKeyId,
    gcpKmsKeyVersionId: "1",
  });

  const walletAddress = await signer.getAddress();
  await createWalletDetails({
    type: WalletType.gcpKms,
    address: walletAddress,
    gcpKmsKeyId: cryptoKeyId,
    gcpKmsKeyRingId: gcpCreds.gcpKmsRingId,
    gcpKmsLocationId: gcpCreds.gcpLocationId,
    gcpKmsKeyVersionId: "1",
    gcpKmsResourcePath: `${key.name!}/cryptoKeysVersion/1`,
    alias,
  });

  return walletAddress;
};

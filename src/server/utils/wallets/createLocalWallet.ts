import { privateKeyToAccount } from "thirdweb/wallets";
import { generatePrivateKey } from "viem/accounts";
import { createWalletDetails } from "../../../db/wallets/createWalletDetails";
import { env } from "../../../utils/env";
import { thirdwebClient } from "../../../utils/sdk";
import { toEncryptedJson } from "./legacyLocalCrypto";

interface CreateLocalWallet {
  label?: string;
}

/**
 * Create a local wallet with a random private key
 * Does not store the wallet in the database
 */
export const createLocalWallet = async () => {
  const pk = generatePrivateKey();
  const account = privateKeyToAccount({
    client: thirdwebClient,
    privateKey: pk,
  });

  const encryptedJsonData = await toEncryptedJson({
    password: env.ENCRYPTION_PASSWORD,
    privateKey: pk,
  });

  return {
    account,
    // these exact values are stored for backwards compatibility
    // only the encryptedJson is used for loading the wallet
    encryptedJson: JSON.stringify({
      data: encryptedJsonData,
      address: account.address,
      strategy: "encryptedJson",
      isEncrypted: true,
    }),
  };
};

/**
 * Creates a local wallet and stores it in the database
 */
export const createAndStoreLocalWallet = async ({
  label,
}: CreateLocalWallet): Promise<string> => {
  const { account, encryptedJson } = await createLocalWallet();

  await createWalletDetails({
    type: "local",
    address: account.address,
    label,
    encryptedJson,
  });

  return account.address;
};

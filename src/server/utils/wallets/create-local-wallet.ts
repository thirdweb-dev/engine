import { encryptKeystore } from "@ethersproject/json-wallets";
import { privateKeyToAccount } from "thirdweb/wallets";
import { generatePrivateKey } from "viem/accounts";
import { createWalletDetails } from "../../../shared/db/wallets/create-wallet-details";
import { env } from "../../../shared/utils/env";
import { thirdwebClient } from "../../../shared/utils/sdk";

interface CreateLocalWallet {
  label?: string;
}

/**
 * Create a local wallet with a random private key
 * Does not store the wallet in the database
 */
export const generateLocalWallet = async () => {
  const pk = generatePrivateKey();
  const account = privateKeyToAccount({
    client: thirdwebClient,
    privateKey: pk,
  });

  const encryptedJsonData = await encryptKeystore(
    {
      address: account.address,
      privateKey: pk,
    },
    env.ENCRYPTION_PASSWORD,
  );

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
export const createLocalWalletDetails = async ({
  label,
}: CreateLocalWallet): Promise<string> => {
  const { account, encryptedJson } = await generateLocalWallet();

  await createWalletDetails({
    type: "local",
    address: account.address,
    label,
    encryptedJson,
  });

  return account.address;
};

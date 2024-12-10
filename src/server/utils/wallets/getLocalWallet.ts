import { LocalWallet } from "@thirdweb-dev/wallets";
import { Wallet } from "ethers";
import type { Address } from "thirdweb";
import { getChainMetadata } from "thirdweb/chains";
import { privateKeyToAccount, type Account } from "thirdweb/wallets";
import { getWalletDetails } from "../../../shared/db/wallets/get-wallet-details";
import { getChain } from "../../../shared/utils/chain";
import { env } from "../../../shared/utils/env";
import { logger } from "../../../shared/utils/logger";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { badChainError } from "../../middleware/error";
import { LocalFileStorage } from "../storage/localStorage";

interface GetLocalWalletParams {
  chainId: number;
  walletAddress: string;
}

/**
 * @deprecated
 * DEPRECATED: Use getLocalWalletAccount instead
 */
export const getLocalWallet = async ({
  chainId,
  walletAddress,
}: GetLocalWalletParams) => {
  const chainV5 = await getChain(chainId);
  const chain = await getChainMetadata(chainV5);
  if (!chain) {
    throw badChainError(chainId);
  }

  const wallet = new LocalWallet({ chain });

  // TODO: Remove this with next breaking change
  try {
    // First, try to load the wallet using the encryption password
    await wallet.load({
      strategy: "encryptedJson",
      password: env.ENCRYPTION_PASSWORD,
      storage: new LocalFileStorage(walletAddress),
    });
  } catch {
    // If that fails, try the thirdweb api secret key for backwards compatibility
    await wallet.load({
      strategy: "encryptedJson",
      password: env.THIRDWEB_API_SECRET_KEY,
      storage: new LocalFileStorage(walletAddress),
    });

    // If that works, save the wallet using the encryption password for the future
    const walletDetails = await getWalletDetails({ address: walletAddress });

    logger({
      service: "worker",
      level: "info",
      message: `[Encryption] Updating local wallet ${walletAddress} to use ENCRYPTION_PASSWORD`,
    });

    await wallet.save({
      strategy: "encryptedJson",
      password: env.ENCRYPTION_PASSWORD,
      storage: new LocalFileStorage(
        walletAddress,
        walletDetails.label ?? undefined,
      ),
    });
  }

  return wallet;
};

export const getLocalWalletAccount = async (
  walletAddress: Address,
): Promise<Account> => {
  const walletDetails = await getWalletDetails({ address: walletAddress });

  if (walletDetails.type !== "local") {
    throw new Error(`Local Wallet not found for address ${walletAddress}`);
  }

  return encryptedJsonToAccount(walletDetails.encryptedJson);
};

export const encryptedJsonToAccount = async (json: string) => {
  const wallet = await Wallet.fromEncryptedJson(
    JSON.parse(json).data,
    env.ENCRYPTION_PASSWORD,
  );

  return privateKeyToAccount({
    client: thirdwebClient,
    privateKey: wallet.privateKey,
  });
};

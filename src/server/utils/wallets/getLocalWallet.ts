import { getChainByChainId } from "@thirdweb-dev/chains";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { getWalletDetails } from "../../../db/wallets/getWalletDetails";
import { env } from "../../../utils/env";
import { LocalFileStorage } from "../storage/localStorage";

interface GetLocalWalletParams {
  chainId: number;
  walletAddress: string;
}

export const getLocalWallet = async ({
  chainId,
  walletAddress,
}: GetLocalWalletParams) => {
  const chain = getChainByChainId(chainId);
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
    if (!walletDetails) {
      throw new Error(
        `Wallet details not found for wallet address ${walletAddress}`,
      );
    }

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

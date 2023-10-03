import { LocalWallet } from "@thirdweb-dev/wallets";
import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";
import { LocalFileStorage } from "../storage/localStorage";

export const createLocalWallet = async (): Promise<string> => {
  if (env.WALLET_CONFIGURATION.type !== WalletType.local) {
    throw new Error(`Server was not configured for local wallet creation.`);
  }

  const wallet = new LocalWallet();
  const walletAddress = await wallet.generate();

  // TODO: File storage should use postgres and be instantiated with local wallet
  await wallet.save({
    strategy: "encryptedJson",
    password: env.THIRDWEB_API_SECRET_KEY,
    storage: new LocalFileStorage(walletAddress),
  });

  await createWalletDetails({
    type: WalletType.local,
    address: walletAddress,
  });

  return walletAddress;
};

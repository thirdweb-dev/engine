import { LocalWallet } from "@thirdweb-dev/wallets";
import { WalletType } from "../../../schema/wallet";
import { getConfig } from "../../../utils/cache/getConfig";
import { env } from "../../../utils/env";
import { LocalFileStorage } from "../storage/localStorage";

interface CreateLocalWallet {
  label?: string;
}

export const createLocalWallet = async ({
  label,
}: CreateLocalWallet): Promise<string> => {
  const config = await getConfig();
  if (config.walletConfiguration.type !== WalletType.local) {
    throw new Error(`Server was not configured for local wallet creation.`);
  }

  const wallet = new LocalWallet();
  const walletAddress = await wallet.generate();

  // Creating wallet details row is handled by LocalFileStorage
  await wallet.save({
    strategy: "encryptedJson",
    password: env.ENCRYPTION_PASSWORD,
    storage: new LocalFileStorage(walletAddress, label),
  });

  return walletAddress;
};

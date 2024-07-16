import { LocalWallet } from "@thirdweb-dev/wallets";
import { env } from "../../../utils/env";
import { LocalFileStorage } from "../storage/localStorage";

interface CreateLocalWallet {
  label?: string;
}

export const createLocalWallet = async ({
  label,
}: CreateLocalWallet): Promise<string> => {
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

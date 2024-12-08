import { LocalWallet } from "@thirdweb-dev/wallets";
import { env } from "../../../shared/utils/env";
import { LocalFileStorage } from "../storage/localStorage";

type ImportLocalWalletParams =
  | {
      method: "privateKey";
      privateKey: string;
      label?: string;
    }
  | {
      method: "mnemonic";
      mnemonic: string;
      label?: string;
    }
  | {
      method: "encryptedJson";
      encryptedJson: string;
      password: string;
      label?: string;
    };

export const importLocalWallet = async (
  options: ImportLocalWalletParams,
): Promise<string> => {
  const wallet = new LocalWallet();

  // TODO: Is there a case where we should enable encryption: true?
  let walletAddress: string;
  switch (options.method) {
    case "privateKey":
      walletAddress = await wallet.import({
        privateKey: options.privateKey,
        encryption: false,
      });
      break;
    case "mnemonic":
      walletAddress = await wallet.import({
        mnemonic: options.mnemonic,
        encryption: false,
      });
      break;
    case "encryptedJson":
      walletAddress = await wallet.import({
        encryptedJson: options.encryptedJson,
        password: options.password,
      });
      break;
  }

  // Creating wallet details gets handled by LocalFileStorage
  await wallet.save({
    strategy: "encryptedJson",
    password: env.ENCRYPTION_PASSWORD,
    storage: new LocalFileStorage(walletAddress, options.label),
  });

  return walletAddress;
};

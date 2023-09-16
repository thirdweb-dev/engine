import { LocalWallet } from "@thirdweb-dev/wallets";
import { createWalletDetails } from "../../../src/db/wallets/createWalletDetails";
import { WalletType } from "../../../src/schema/wallet";

type ImportLocalWalletParams =
  | {
      method: "privateKey";
      privateKey: string;
    }
  | {
      method: "mnemonic";
      mnemonic: string;
    }
  | {
      method: "encryptedJson";
      encryptedJson: string;
      password: string;
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

  await createWalletDetails({
    address: walletAddress,
    type: WalletType.local,
  });

  return walletAddress;
};

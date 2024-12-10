import { LocalWallet } from "@thirdweb-dev/wallets";
import { updateConfiguration } from "../../db/configuration/update-configuration";
import { env } from "../env";
import { logger } from "../logger";
import { getConfig } from "./getConfig";

let authWallet: LocalWallet | undefined;

export const getAuthWallet = async (): Promise<LocalWallet> => {
  if (!authWallet) {
    const config = await getConfig();
    authWallet = new LocalWallet();

    try {
      // First, we try to load the wallet with the encryption password
      await authWallet.import({
        encryptedJson: config.authWalletEncryptedJson,
        password: env.ENCRYPTION_PASSWORD,
      });
    } catch {
      // If that fails, we try to load the wallet with the secret key
      await authWallet.import({
        encryptedJson: config.authWalletEncryptedJson,
        password: env.THIRDWEB_API_SECRET_KEY,
      });

      // And then update the auth wallet to use encryption password instead
      const encryptedJson = await authWallet.export({
        strategy: "encryptedJson",
        password: env.ENCRYPTION_PASSWORD,
      });

      logger({
        service: "server",
        level: "info",
        message:
          "[Encryption] Updating authWalletEncryptedJson to use ENCRYPTION_PASSWORD",
      });

      await updateConfiguration({
        authWalletEncryptedJson: encryptedJson,
      });
    }
  }

  return authWallet;
};

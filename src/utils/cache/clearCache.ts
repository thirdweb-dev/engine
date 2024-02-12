import { configCache } from "./getConfig";
import { sdkCache } from "./getSdk";
import { walletsCache } from "./getWallet";
import { webhookCache } from "./getWebhook";

export const clearCache = () => {
  // Reset config
  configCache.clear();

  // Reset webhooks
  webhookCache.clear();

  // Reset SDK
  sdkCache.clear();

  // Reset Wallet
  walletsCache.clear();
};

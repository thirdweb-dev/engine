import { env } from "../env";
import { configCache } from "./getConfig";
import { sdkCache } from "./getSdk";
import { walletsCache } from "./getWallet";
import { webhookCache } from "./getWebhook";

export const clearCache = async (
  service: (typeof env)["LOG_SERVICES"][0],
): Promise<void> => {
  // Reset config
  configCache.clear();

  // Reset webhooks
  webhookCache.clear();

  // Reset SDK
  sdkCache.clear();

  // Reset Wallet
  walletsCache.clear();
};

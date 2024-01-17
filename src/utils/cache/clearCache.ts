import { env } from "../env";
import { logger } from "../logger";
import { configCache } from "./getConfig";
import { sdkCache } from "./getSdk";
import { walletsCache } from "./getWallet";
import { webhookCache } from "./getWebhook";

export const clearCache = async (
  service: (typeof env)["LOG_SERVICES"][0],
): Promise<void> => {
  logger({
    level: "info",
    service,
    message: "Resetting Cache",
  });

  // Reset config
  configCache.clear();

  // Reset webhooks
  webhookCache.clear();

  // Reset SDK
  sdkCache.clear();

  // Reset Wallet
  walletsCache.clear();
};

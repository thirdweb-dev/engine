import { env } from "../env";
import { accessTokenCache } from "./accessToken";
import { clearConfigCache } from "./getConfig";
import { sdkCache } from "./getSdk";
import { walletsCache } from "./getWallet";
import { clearWebhookCache } from "./getWebhook";

export const clearCache = async (
  service: (typeof env)["LOG_SERVICES"][0],
): Promise<void> => {
  await clearConfigCache();
  await clearWebhookCache();
  sdkCache.clear();
  walletsCache.clear();
  accessTokenCache.clear();
};

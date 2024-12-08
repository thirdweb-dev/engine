import type { env } from "../env";
import { accessTokenCache } from "./accessToken";
import { invalidateConfig } from "./getConfig";
import { sdkCache } from "./getSdk";
import { walletsCache } from "./getWallet";
import { webhookCache } from "./getWebhook";
import { keypairCache } from "./keypair";

export const clearCache = async (
  service: (typeof env)["LOG_SERVICES"][0],
): Promise<void> => {
  invalidateConfig();
  webhookCache.clear();
  sdkCache.clear();
  walletsCache.clear();
  accessTokenCache.clear();
  keypairCache.clear();
};

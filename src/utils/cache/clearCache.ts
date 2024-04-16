import { env } from "../env";
import { accessTokenCache } from "./accessToken";
import { configCache } from "./getConfig";
import { sdkCache } from "./getSdk";
import { walletsCache } from "./getWallet";
import { webhookCache } from "./getWebhook";
import { keypairCache } from "./keypair";

export const clearCache = async (
  service: (typeof env)["LOG_SERVICES"][0],
): Promise<void> => {
  configCache.clear();
  webhookCache.clear();
  sdkCache.clear();
  walletsCache.clear();
  accessTokenCache.clear();
  keypairCache.clear();
};

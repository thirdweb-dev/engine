import type { env } from "../env.js";
import { accessTokenCache } from "./access-token.js";
import { invalidateConfig } from "./get-config.js";
import { sdkCache } from "./get-sdk.js";
import { walletsCache } from "./get-wallet.js";
import { webhookCache } from "./get-webhook.js";
import { keypairCache } from "./keypair.js";

export const clearCache = async (
  _service: (typeof env)["LOG_SERVICES"][0],
): Promise<void> => {
  invalidateConfig();
  webhookCache.clear();
  sdkCache.clear();
  walletsCache.clear();
  accessTokenCache.clear();
  keypairCache.clear();
};

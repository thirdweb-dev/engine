import type { env } from "../env";
import { accessTokenCache } from "./access-token";
import { invalidateConfig } from "./get-config";
import { sdkCache } from "./get-sdk";
import { walletsCache } from "./get-wallet";
import { webhookCache } from "./get-webhook";
import { keypairCache } from "./keypair";

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

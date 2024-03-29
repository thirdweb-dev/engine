import { env } from "../env";
import { accessTokenCache } from "./accessToken";
import { clearConfigCache } from "./getConfig";
import { sdkCache } from "./getSdk";

export const clearCache = async (
  service: (typeof env)["LOG_SERVICES"][0],
): Promise<void> => {
  await clearConfigCache();
  sdkCache.clear();
  accessTokenCache.clear();
};

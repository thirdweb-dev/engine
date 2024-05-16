import { getConfiguration } from "../../db/configuration/getConfiguration";
import { Config } from "../../schema/config";

const cacheKey = "config";
export const configCache = new Map<string, Config>();

export const getConfig = async (retrieveFromCache = true): Promise<Config> => {
  if (
    configCache.has(cacheKey) &&
    configCache.get(cacheKey) &&
    retrieveFromCache
  ) {
    const config = configCache.get(cacheKey) as Config;

    if (config.authDomain && config.authWalletEncryptedJson) {
      return config;
    }
  }

  const configData = await getConfiguration();
  configCache.set(cacheKey, configData);
  return configData;
};

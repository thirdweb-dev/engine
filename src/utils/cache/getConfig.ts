import {
  Config,
  getConfiguration,
} from "../../db/configuration/getConfiguration";

const cacheKey = "config";
const configCache = new Map<string, Config>();

export const getConfig = async (
  retrieveFromCache = true,
): Promise<
  Omit<Config, "thirdwebApiSecretKey"> & { thirdwebApiSecretKey: string }
> => {
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

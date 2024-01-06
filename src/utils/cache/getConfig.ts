import { Configuration } from "@prisma/client";
import { getConfiguration } from "../../db/configuration/getConfiguration";
import { WalletType } from "../../schema/wallet";

const cacheKey = "config";
interface Config
  extends Omit<
    Configuration,
    | "awsAccessKeyId"
    | "awsSecretAccessKey"
    | "awsRegion"
    | "gcpApplicationProjectId"
    | "gcpKmsLocationId"
    | "gcpKmsKeyRingId"
    | "gcpApplicationCredentialEmail"
    | "gcpApplicationCredentialPrivateKey"
  > {
  walletConfiguration:
    | {
        type: WalletType.local;
      }
    | {
        type: WalletType.awsKms;
        awsAccessKeyId: string;
        awsSecretAccessKey: string;
        awsRegion: string;
      }
    | {
        type: WalletType.gcpKms;
        gcpApplicationProjectId: string;
        gcpKmsLocationId: string;
        gcpKmsKeyRingId: string;
        gcpApplicationCredentialEmail: string;
        gcpApplicationCredentialPrivateKey: string;
      };
}

const configCache = new Map<string, Config>();

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

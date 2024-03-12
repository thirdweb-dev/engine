import { Configuration } from "@prisma/client";
import { getRedis } from "../../db/client";
import { getConfiguration } from "../../db/configuration/getConfiguration";
import { WalletType } from "../../schema/wallet";
import { logger } from "../logger";

const cacheKey = "engineConfig";
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

export const getConfig = async (retrieveFromCache = true): Promise<Config> => {
  const redisClient = await getRedis();
  const config = JSON.parse((await redisClient.get(cacheKey)) as string);

  if (config && retrieveFromCache) {
    if (config.authDomain && config.authWalletEncryptedJson) {
      return config;
    }
  }

  const configData = await getConfiguration();

  redisClient.set(cacheKey, JSON.stringify(configData));
  return configData;
};

export const clearConfigCache = async (): Promise<void> => {
  logger({
    level: "info",
    message: "Clearing config cache",
    service: "cache",
  });
  const redisClient = await getRedis();
  redisClient.del(cacheKey);
};

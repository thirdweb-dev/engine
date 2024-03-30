import { Configuration } from "@prisma/client";
import { getConfiguration } from "../../db/configuration/getConfiguration";
import { WalletType } from "../../schema/wallet";
import {
  cacheKeyConfiguration,
  getCache,
  invalidateCache,
  setCache,
} from "../redis/cache";

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

export const getConfig = async (): Promise<Config> => {
  const key = cacheKeyConfiguration();
  const cached = await getCache<Config>(key);
  if (cached) {
    return cached;
  }

  const config = await getConfiguration();
  await setCache(key, config);
  return config;
};

export const clearConfigCache = async (): Promise<void> => {
  const key = cacheKeyConfiguration();
  await invalidateCache(key);
};

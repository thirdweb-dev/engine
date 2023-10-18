import { Configuration } from "@prisma/client";
import { WalletType } from "../../schema/wallet";
import { decrypt } from "../../utils/crypto";
import { prisma } from "../client";

interface Config extends Configuration {
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

const withWalletConfig = (config: Configuration): Config => {
  return {
    ...config,
    walletConfiguration:
      config.awsAccessKeyId && config.awsSecretAccessKey && config.awsRegion
        ? {
            type: WalletType.awsKms,
            awsAccessKeyId: config.awsAccessKeyId,
            awsSecretAccessKey: decrypt(config.awsSecretAccessKey),
            awsRegion: config.awsRegion,
          }
        : config.gcpApplicationProjectId &&
          config.gcpKmsLocationId &&
          config.gcpKmsKeyRingId &&
          config.gcpApplicationCredentialEmail &&
          config.gcpApplicationCredentialPrivateKey
        ? {
            type: WalletType.gcpKms,
            gcpApplicationProjectId: config.gcpApplicationProjectId,
            gcpKmsLocationId: config.gcpKmsLocationId,
            gcpKmsKeyRingId: config.gcpKmsKeyRingId,
            gcpApplicationCredentialEmail: config.gcpApplicationCredentialEmail,
            gcpApplicationCredentialPrivateKey: decrypt(
              config.gcpApplicationCredentialPrivateKey,
            ),
          }
        : {
            type: WalletType.local,
          },
  };
};

export const getConfiguration = async (): Promise<Config> => {
  let config = await prisma.configuration.findFirst();

  if (!config) {
    // Here we set all our defaults when first creating the configuration
    config = await prisma.configuration.create({
      data: {
        minTxsToProcess: 1,
        maxTxsToProcess: 10,
        minedTxListenerCronSchedule: "*/5 * * * * *",
        maxTxsToUpdate: 50,
        retryTxListenerCronSchedule: "*/30 * * * * *",
        minEllapsedBlocksBeforeRetry: 15,
        maxFeePerGasForRetries: "55000000000",
        maxPriorityFeePerGasForRetries: "55000000000",
        maxRetriesPerTx: 3,
      },
    });
  }

  return withWalletConfig(config);
};

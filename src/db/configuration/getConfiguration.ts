import { Configuration } from "@prisma/client";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { WalletType } from "../../schema/wallet";
import { decrypt } from "../../utils/cypto";
import { env } from "../../utils/env";
import { prisma } from "../client";
import { updateConfiguration } from "./updateConfiguration";

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

const createAuthWalletEncryptedJson = async () => {
  const wallet = new LocalWallet();
  await wallet.generate();
  return wallet.export({
    strategy: "encryptedJson",
    password: env.THIRDWEB_API_SECRET_KEY,
  });
};

export const getConfiguration = async (): Promise<Config> => {
  let config = await prisma.configuration.findUnique({
    where: {
      id: "default",
    },
  });

  if (!config) {
    // Here we set all our defaults when first creating the configuration
    config = await prisma.configuration.upsert({
      where: {
        id: "default",
      },
      create: {
        minTxsToProcess: 1,
        maxTxsToProcess: 10,
        minedTxListenerCronSchedule: "*/5 * * * * *",
        maxTxsToUpdate: 50,
        retryTxListenerCronSchedule: "*/30 * * * * *",
        minEllapsedBlocksBeforeRetry: 15,
        maxFeePerGasForRetries: "55000000000",
        maxPriorityFeePerGasForRetries: "55000000000",
        maxRetriesPerTx: 3,
        authDomain: "thirdweb.com",
        authWalletEncryptedJson: await createAuthWalletEncryptedJson(),
      },
      update: {},
    });
  } else if (!config.authDomain && !config.authWalletEncryptedJson) {
    // TODO: Use a more generic method to fill missing fields
    config = await updateConfiguration({
      authDomain: "thirdweb.com",
      authWalletEncryptedJson: await createAuthWalletEncryptedJson(),
    });
  }

  return withWalletConfig(config);
};

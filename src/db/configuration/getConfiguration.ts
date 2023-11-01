import { Configuration } from "@prisma/client";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { WalletType } from "../../schema/wallet";
import { decrypt, encrypt } from "../../utils/crypto";
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

const withWalletConfig = async (config: Configuration): Promise<Config> => {
  // TODO: Remove backwards compatibility with next breaking change
  if (config.awsAccessKeyId && config.awsSecretAccessKey && config.awsRegion) {
    // First try to load the aws secret using the encryption password
    let awsSecretAccessKey = decrypt(
      config.awsSecretAccessKey,
      env.ENCRYPTION_PASSWORD,
    );

    // If that fails, try to load the aws secret using the thirdweb api secret key
    if (!awsSecretAccessKey) {
      awsSecretAccessKey = decrypt(
        config.awsSecretAccessKey,
        env.THIRDWEB_API_SECRET_KEY,
      );

      // If that succeeds, update the configuration with the encryption password instead
      if (awsSecretAccessKey) {
        await updateConfiguration({
          awsSecretAccessKey: encrypt(awsSecretAccessKey),
        });
      }
    }

    return {
      ...config,
      walletConfiguration: {
        type: WalletType.awsKms,
        awsRegion: config.awsRegion,
        awsAccessKeyId: config.awsAccessKeyId,
        awsSecretAccessKey,
      },
    };
  }

  // TODO: Remove backwards compatibility with next breaking change
  if (
    config.gcpApplicationProjectId &&
    config.gcpKmsLocationId &&
    config.gcpKmsKeyRingId &&
    config.gcpApplicationCredentialEmail &&
    config.gcpApplicationCredentialPrivateKey
  ) {
    // First try to load the gcp secret using the encryption password
    let gcpApplicationCredentialPrivateKey = decrypt(
      config.gcpApplicationCredentialPrivateKey,
      env.ENCRYPTION_PASSWORD,
    );

    // If that fails, try to load the gcp secret using the thirdweb api secret key
    if (!gcpApplicationCredentialPrivateKey) {
      gcpApplicationCredentialPrivateKey = decrypt(
        config.gcpApplicationCredentialPrivateKey,
        env.THIRDWEB_API_SECRET_KEY,
      );

      // If that succeeds, update the configuration with the encryption password instead
      if (gcpApplicationCredentialPrivateKey) {
        await updateConfiguration({
          gcpApplicationCredentialPrivateKey: encrypt(
            gcpApplicationCredentialPrivateKey,
          ),
        });
      }
    }

    return {
      ...config,
      walletConfiguration: {
        type: WalletType.gcpKms,
        gcpApplicationProjectId: config.gcpApplicationProjectId,
        gcpKmsLocationId: config.gcpKmsLocationId,
        gcpKmsKeyRingId: config.gcpKmsKeyRingId,
        gcpApplicationCredentialEmail: config.gcpApplicationCredentialEmail,
        gcpApplicationCredentialPrivateKey,
      },
    };
  }

  return {
    ...config,
    walletConfiguration: {
      type: WalletType.local,
    },
  };
};

const createAuthWalletEncryptedJson = async () => {
  const wallet = new LocalWallet();
  await wallet.generate();
  return wallet.export({
    strategy: "encryptedJson",
    password: env.ENCRYPTION_PASSWORD,
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
        minWalletBalance: "20000000000000000",
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

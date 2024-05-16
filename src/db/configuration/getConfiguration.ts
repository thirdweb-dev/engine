import { Configuration } from "@prisma/client";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { ethers } from "ethers";
import { Config } from "../../schema/config";
import { WalletType } from "../../schema/wallet";
import { mandatoryAllowedCorsUrls } from "../../server/utils/cors-urls";
import { decrypt } from "../../utils/crypto";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { prisma } from "../client";
import { updateConfiguration } from "./updateConfiguration";

const withWalletConfig = async (config: Configuration): Promise<Config> => {
  // We destructure the config to omit wallet related fields to prevent direct access
  const {
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion,
    gcpApplicationProjectId,
    gcpKmsLocationId,
    gcpKmsKeyRingId,
    gcpApplicationCredentialEmail,
    gcpApplicationCredentialPrivateKey,
    ...restConfig
  } = config;

  // TODO: Remove backwards compatibility with next breaking change
  if (awsAccessKeyId && awsSecretAccessKey && awsRegion) {
    // First try to load the aws secret using the encryption password
    let decryptedSecretAccessKey = decrypt(
      awsSecretAccessKey,
      env.ENCRYPTION_PASSWORD,
    );

    // If that fails, try to load the aws secret using the thirdweb api secret key
    if (!awsSecretAccessKey) {
      decryptedSecretAccessKey = decrypt(
        awsSecretAccessKey,
        env.THIRDWEB_API_SECRET_KEY,
      );

      // If that succeeds, update the configuration with the encryption password instead
      if (decryptedSecretAccessKey) {
        logger({
          service: "worker",
          level: "info",
          message: `[Encryption] Updating awsSecretAccessKey to use ENCRYPTION_PASSWORD`,
        });

        await updateConfiguration({
          awsSecretAccessKey: decryptedSecretAccessKey,
        });
      }
    }

    // Renaming contractSubscriptionsRetryDelaySeconds
    // to contractSubscriptionsRequeryDelaySeconds to reflect its purpose
    // as we are requerying (& not retrying) with different delays
    return {
      ...restConfig,
      contractSubscriptionsRequeryDelaySeconds:
        restConfig.contractSubscriptionsRetryDelaySeconds,
      walletConfiguration: {
        type: WalletType.awsKms,
        awsRegion,
        awsAccessKeyId,
        awsSecretAccessKey: decryptedSecretAccessKey,
      },
    };
  }

  // TODO: Remove backwards compatibility with next breaking change
  if (
    gcpApplicationProjectId &&
    gcpKmsLocationId &&
    gcpKmsKeyRingId &&
    gcpApplicationCredentialEmail &&
    gcpApplicationCredentialPrivateKey
  ) {
    // First try to load the gcp secret using the encryption password
    let decryptedGcpKey = decrypt(
      gcpApplicationCredentialPrivateKey,
      env.ENCRYPTION_PASSWORD,
    );

    // If that fails, try to load the gcp secret using the thirdweb api secret key
    if (!gcpApplicationCredentialPrivateKey) {
      decryptedGcpKey = decrypt(
        gcpApplicationCredentialPrivateKey,
        env.THIRDWEB_API_SECRET_KEY,
      );

      // If that succeeds, update the configuration with the encryption password instead
      if (decryptedGcpKey) {
        logger({
          service: "worker",
          level: "info",
          message: `[Encryption] Updating gcpApplicationCredentialPrivateKey to use ENCRYPTION_PASSWORD`,
        });

        await updateConfiguration({
          gcpApplicationCredentialPrivateKey: decryptedGcpKey,
        });
      }
    }

    return {
      ...restConfig,
      walletConfiguration: {
        type: WalletType.gcpKms,
        gcpApplicationProjectId,
        gcpKmsLocationId,
        gcpKmsKeyRingId,
        gcpApplicationCredentialEmail,
        gcpApplicationCredentialPrivateKey: decryptedGcpKey,
      },
    };
  }

  return {
    ...restConfig,
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
        maxTxsToProcess: 30,
        minedTxListenerCronSchedule: "*/5 * * * * *",
        maxTxsToUpdate: 50,
        retryTxListenerCronSchedule: "*/15 * * * * *",
        indexerListenerCronSchedule: "*/5 * * * * *",
        maxBlocksToIndex: 25,
        cursorDelaySeconds: 2,
        minEllapsedBlocksBeforeRetry: 12,
        maxFeePerGasForRetries: ethers.utils
          .parseUnits("10000", "gwei")
          .toString(),
        maxPriorityFeePerGasForRetries: ethers.utils
          .parseUnits("10000", "gwei")
          .toString(),
        maxRetriesPerTx: 3,
        authDomain: "thirdweb.com",
        authWalletEncryptedJson: await createAuthWalletEncryptedJson(),
        minWalletBalance: "20000000000000000",
        accessControlAllowOrigin: mandatoryAllowedCorsUrls.join(","),
        clearCacheCronSchedule: "*/30 * * * * *",
      },
      update: {},
    });
  } else if (!config.authDomain && !config.authWalletEncryptedJson) {
    // TODO: Use a more generic method to fill missing fields
    config = await updateConfiguration({
      authDomain: "thirdweb.com",
      authWalletEncryptedJson: await createAuthWalletEncryptedJson(),
    });
  } else if (!config.accessControlAllowOrigin) {
    config = await updateConfiguration({
      accessControlAllowOrigin: mandatoryAllowedCorsUrls.join(","),
    });
  } else if (!config.indexerListenerCronSchedule) {
    config = await updateConfiguration({
      indexerListenerCronSchedule: "*/5 * * * * *",
    });
  }

  return withWalletConfig(config);
};

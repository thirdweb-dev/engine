import type { Configuration } from "@prisma/client";
import type { Static } from "@sinclair/typebox";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { ethers } from "ethers";
import type { Chain } from "thirdweb";
import type {
  AwsWalletConfiguration,
  CircleWalletConfiguration,
  GcpWalletConfiguration,
  ParsedConfig,
} from "../../schemas/config.js";
import { WalletType } from "../../schemas/wallet.js";
import { mandatoryAllowedCorsUrls } from "../../../server/utils/cors-urls.js";
import type { networkResponseSchema } from "../../utils/cache/get-sdk.js";
import { decrypt } from "../../utils/crypto.js";
import { env } from "../../utils/env.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../client.js";
import { updateConfiguration } from "./update-configuration.js";
import * as z from "zod";

export const walletProviderConfigsSchema = z.object({
  circle: z
    .object({
      apiKey: z.string(),
    })
    .optional(),
});

const toParsedConfig = async (config: Configuration): Promise<ParsedConfig> => {
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
    contractSubscriptionsRetryDelaySeconds,
    walletProviderConfigs,
    ...restConfig
  } = config;

  // Parse "chainOverrides" JSON to an array of Chain[] items.
  let chainOverridesParsed: Chain[] = [];
  if (config.chainOverrides) {
    try {
      const parsed: Static<typeof networkResponseSchema>[] = JSON.parse(
        config.chainOverrides,
      );

      chainOverridesParsed = parsed.map((chain): Chain => {
        const specifiedRpc = chain.rpc?.[0];

        if (!specifiedRpc) {
          throw new Error(
            `Chain ${chain.name} has no RPC specified. Please add a valid RPC URL to the chain configuration.`,
          );
        }

        return {
          id: chain.chainId,
          name: chain.name,
          rpc: specifiedRpc,
          nativeCurrency: chain.nativeCurrency,
          testnet: chain.testnet ? true : undefined,
        };
      });
    } catch (e) {
      logger({
        service: "server",
        level: "error",
        message: `Failed parsing chainOverrides: ${e}`,
      });
    }
  }

  // LEGACY COMPATIBILITY
  // legacy behaviour was to check for these in order:
  // 1. AWS KMS Configuration - if found, wallet type is AWS KMS
  // 2. GCP KMS Configuration - if found, wallet type is GCP KMS
  // 3. If neither are found, wallet type is Local
  // to maintain compatibility where users expect to call create new backend wallet endpoint without an explicit wallet type
  // we need to preserve the wallet type in the configuration but only as the "default" wallet type
  let legacyWalletType_removeInNextBreakingChange: WalletType =
    WalletType.local;

  let awsWalletConfiguration: AwsWalletConfiguration | null = null;

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
          message:
            "[Encryption] Updating awsSecretAccessKey to use ENCRYPTION_PASSWORD",
        });

        await updateConfiguration({
          awsSecretAccessKey: decryptedSecretAccessKey,
        });
      }
    }

    // Renaming contractSubscriptionsRetryDelaySeconds
    // to contractSubscriptionsRequeryDelaySeconds to reflect its purpose
    // as we are requerying (& not retrying) with different delays
    awsWalletConfiguration = {
      awsAccessKeyId,
      awsSecretAccessKey: decryptedSecretAccessKey,
      defaultAwsRegion: awsRegion,
    };

    legacyWalletType_removeInNextBreakingChange = WalletType.awsKms;
  }

  let gcpWalletConfiguration: GcpWalletConfiguration | null = null;
  // TODO: Remove backwards compatibility with next breaking change
  if (gcpApplicationCredentialEmail && gcpApplicationCredentialPrivateKey) {
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
          message:
            "[Encryption] Updating gcpApplicationCredentialPrivateKey to use ENCRYPTION_PASSWORD",
        });

        await updateConfiguration({
          gcpApplicationCredentialPrivateKey: decryptedGcpKey,
        });
      }
    }

    if (!gcpKmsLocationId || !gcpKmsKeyRingId || !gcpApplicationProjectId) {
      throw new Error(
        "GCP KMS location ID, project ID, and key ring ID are required configuration for this wallet type",
      );
    }

    gcpWalletConfiguration = {
      gcpApplicationCredentialEmail,
      gcpApplicationCredentialPrivateKey: decryptedGcpKey,

      // TODO: Remove these with the next breaking change
      // These are used because import endpoint does not yet support GCP KMS resource path
      defaultGcpKmsLocationId: gcpKmsLocationId,
      defaultGcpKmsKeyRingId: gcpKmsKeyRingId,
      defaultGcpApplicationProjectId: gcpApplicationProjectId,
    };

    legacyWalletType_removeInNextBreakingChange = WalletType.gcpKms;
  }

  let circleWalletConfiguration: CircleWalletConfiguration | null = null;

  const {
    data: parsedWalletProviderConfigs,
    success,
    error: walletProviderConfigsParseError,
  } = walletProviderConfigsSchema.safeParse(walletProviderConfigs?.valueOf());

  // TODO: fail loudly if walletProviderConfigs is not valid
  if (!success) {
    logger({
      level: "error",
      message: "Invalid wallet provider configs",
      service: "server",
      error: walletProviderConfigsParseError,
    });
  }

  if (parsedWalletProviderConfigs?.circle) {
    circleWalletConfiguration = {
      apiKey: decrypt(
        parsedWalletProviderConfigs.circle.apiKey,
        env.ENCRYPTION_PASSWORD,
      ),
    };
  }

  return {
    ...restConfig,
    contractSubscriptionsRequeryDelaySeconds:
      contractSubscriptionsRetryDelaySeconds,
    chainOverridesParsed,
    walletConfiguration: {
      aws: awsWalletConfiguration,
      gcp: gcpWalletConfiguration,
      circle: circleWalletConfiguration,
      legacyWalletType_removeInNextBreakingChange,
    },
    mtlsCertificate: config.mtlsCertificateEncrypted
      ? decrypt(config.mtlsCertificateEncrypted, env.ENCRYPTION_PASSWORD)
      : null,
    mtlsPrivateKey: config.mtlsPrivateKeyEncrypted
      ? decrypt(config.mtlsPrivateKeyEncrypted, env.ENCRYPTION_PASSWORD)
      : null,
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

export const getConfiguration = async (): Promise<ParsedConfig> => {
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

  const result = await toParsedConfig(config);
  return result;
};

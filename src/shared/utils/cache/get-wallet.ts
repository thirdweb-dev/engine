import type { EVMWallet } from "@thirdweb-dev/wallets";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { GcpKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/gcp-kms";
import {
  WalletDetailsError,
  getWalletDetails,
  type ParsedWalletDetails,
} from "../../db/wallets/get-wallet-details.js";
import type { PrismaTransaction } from "../../schemas/prisma.js";
import { WalletType } from "../../schemas/wallet.js";
import { createCustomError } from "../../../server/middleware/error.js";
import { splitAwsKmsArn } from "../../../server/utils/wallets/aws-kms-arn.js";
import { splitGcpKmsResourcePath } from "../../../server/utils/wallets/gcp-kms-resource-path.js";
import { getLocalWallet } from "../../../server/utils/wallets/get-local-wallet.js";
import { getSmartWallet } from "../../../server/utils/wallets/get-smart-wallet.js";
import { LRUCache } from "lru-cache";

export const walletsCache = new LRUCache<string, EVMWallet>({ max: 2048 });

interface GetWalletParams {
  pgtx?: PrismaTransaction;
  chainId: number;
  walletAddress: string;
  accountAddress?: string;
}

export const getWallet = async <TWallet extends EVMWallet>({
  pgtx,
  chainId,
  walletAddress,
  accountAddress,
}: GetWalletParams): Promise<TWallet> => {
  const cacheKey = accountAddress
    ? `${chainId}-${walletAddress}-${accountAddress}`
    : `${chainId}-${walletAddress}`;

  const cachedWallet = walletsCache.get(cacheKey);
  if (cachedWallet) {
    return cachedWallet as TWallet;
  }

  let walletDetails: ParsedWalletDetails;

  try {
    walletDetails = await getWalletDetails({
      pgtx,
      address: walletAddress,
    });
  } catch (e) {
    if (e instanceof WalletDetailsError) {
      throw createCustomError(e.message, 400, "BAD_REQUEST");
    }
    throw e;
  }

  let wallet: EVMWallet;
  switch (walletDetails.type) {
    case WalletType.awsKms: {
      const splitArn = splitAwsKmsArn(walletDetails.awsKmsArn);

      wallet = new AwsKmsWallet({
        keyId: splitArn.keyId,
        region: splitArn.region,
        accessKeyId: walletDetails.awsKmsAccessKeyId,
        secretAccessKey: walletDetails.awsKmsSecretAccessKey,
      });

      break;
    }

    case WalletType.gcpKms: {
      const splitResourcePath = splitGcpKmsResourcePath(
        walletDetails.gcpKmsResourcePath,
      );

      wallet = new GcpKmsWallet({
        keyId: splitResourcePath.cryptoKeyId,
        keyRingId: splitResourcePath.keyRingId,
        keyVersion: splitResourcePath.versionId,
        locationId: splitResourcePath.locationId,
        projectId: splitResourcePath.projectId,

        applicationCredentialEmail: walletDetails.gcpApplicationCredentialEmail,
        applicationCredentialPrivateKey:
          walletDetails.gcpApplicationCredentialPrivateKey,
      });
      break;
    }

    case WalletType.local:
      wallet = await getLocalWallet({ chainId, walletAddress });
      break;

    case WalletType.smartAwsKms: {
      if (accountAddress)
        throw new Error(
          "Smart backend wallet cannot be used to operate external smart account",
        );

      const splitArn = splitAwsKmsArn(walletDetails.awsKmsArn);

      const adminWallet = new AwsKmsWallet({
        keyId: splitArn.keyId,
        region: splitArn.region,
        accessKeyId: walletDetails.awsKmsAccessKeyId,
        secretAccessKey: walletDetails.awsKmsSecretAccessKey,
      });

      const smartWallet: EVMWallet = await getSmartWallet({
        chainId,
        backendWallet: adminWallet,
        accountAddress: walletDetails.address,
        factoryAddress: walletDetails.accountFactoryAddress ?? undefined,
        entrypointAddress: walletDetails.entrypointAddress ?? undefined,
      });

      return smartWallet as TWallet;
    }

    case WalletType.smartGcpKms: {
      if (accountAddress)
        throw new Error(
          "Smart backend wallet cannot be used to operate external smart account",
        );

      const splitResourcePath = splitGcpKmsResourcePath(
        walletDetails.gcpKmsResourcePath,
      );

      const adminWallet = new GcpKmsWallet({
        keyId: splitResourcePath.cryptoKeyId,
        keyRingId: splitResourcePath.keyRingId,
        keyVersion: splitResourcePath.versionId,
        locationId: splitResourcePath.locationId,
        projectId: splitResourcePath.projectId,

        applicationCredentialEmail: walletDetails.gcpApplicationCredentialEmail,
        applicationCredentialPrivateKey:
          walletDetails.gcpApplicationCredentialPrivateKey,
      });

      const smartWallet: EVMWallet = await getSmartWallet({
        chainId,
        backendWallet: adminWallet,
        accountAddress: walletDetails.address,
        factoryAddress: walletDetails.accountFactoryAddress ?? undefined,
        entrypointAddress: walletDetails.entrypointAddress ?? undefined,
      });

      return smartWallet as TWallet;
    }

    case WalletType.smartLocal: {
      if (accountAddress)
        throw new Error(
          "Smart backend wallet cannot be used to operate external smart account",
        );

      const adminWallet = await getLocalWallet({ chainId, walletAddress });

      const smartWallet: EVMWallet = await getSmartWallet({
        chainId,
        backendWallet: adminWallet,
        accountAddress: walletDetails.address,
        factoryAddress: walletDetails.accountFactoryAddress ?? undefined,
        entrypointAddress: walletDetails.entrypointAddress ?? undefined,
      });

      return smartWallet as TWallet;
    }

    default:
      throw new Error(
        `Wallet with address ${walletAddress} of type ${walletDetails.type} is not supported for these routes yet`,
      );
  }

  if (!accountAddress) {
    // If no account is specified, use the backend wallet itself
    walletsCache.set(cacheKey, wallet);
    return wallet as TWallet;
  }

  // Otherwise, return the account with the backend wallet as the personal wallet
  const smartWallet: EVMWallet = await getSmartWallet({
    chainId,
    backendWallet: wallet,
    accountAddress: accountAddress,
  });

  walletsCache.set(cacheKey, smartWallet);
  return smartWallet as TWallet;
};

import type { EVMWallet } from "@thirdweb-dev/wallets";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { GcpKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/gcp-kms";
import { StatusCodes } from "http-status-codes";
import { getWalletDetails } from "../../db/wallets/getWalletDetails";
import type { PrismaTransaction } from "../../schema/prisma";
import { WalletType } from "../../schema/wallet";
import { createCustomError } from "../../server/middleware/error";
import { splitAwsKmsArn } from "../../server/utils/wallets/awsKmsArn";
import { splitGcpKmsResourcePath } from "../../server/utils/wallets/gcpKmsResourcePath";
import { getLocalWallet } from "../../server/utils/wallets/getLocalWallet";
import { getSmartWallet } from "../../server/utils/wallets/getSmartWallet";
import { getConfig } from "./getConfig";

export const walletsCache = new Map<string, EVMWallet>();

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

  const walletDetails = await getWalletDetails({
    pgtx,
    address: walletAddress,
  });

  if (!walletDetails) {
    throw createCustomError(
      `No configured wallet found with address ${walletAddress}`,
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }

  const config = await getConfig();

  let wallet: EVMWallet;
  switch (walletDetails.type) {
    case WalletType.awsKms: {
      if (!walletDetails.awsKmsArn) {
        throw new Error("AWS KMS ARN is missing for the wallet");
      }

      const splitArn = splitAwsKmsArn(walletDetails.awsKmsArn);

      const accessKeyId =
        walletDetails.awsKmsAccessKeyId ??
        config.walletConfiguration.aws?.awsAccessKeyId;

      const secretAccessKey =
        walletDetails.awsKmsSecretAccessKey ??
        config.walletConfiguration.aws?.awsSecretAccessKey;

      if (!(accessKeyId && secretAccessKey)) {
        throw new Error(
          "AWS KMS access key id and secret access key are missing for the wallet",
        );
      }

      wallet = new AwsKmsWallet({
        keyId: splitArn.keyId,
        region: splitArn.region,
        accessKeyId,
        secretAccessKey,
      });

      break;
    }

    case WalletType.gcpKms: {
      if (!walletDetails.gcpKmsResourcePath) {
        throw new Error("GCP KMS resource path is missing for the wallet");
      }
      const splitResourcePath = splitGcpKmsResourcePath(
        walletDetails.gcpKmsResourcePath,
      );

      const email =
        walletDetails.gcpApplicationCredentialEmail ??
        config.walletConfiguration.gcp?.gcpApplicationCredentialEmail;
      const privateKey =
        walletDetails.gcpApplicationCredentialPrivateKey ??
        config.walletConfiguration.gcp?.gcpApplicationCredentialPrivateKey;

      if (!(email && privateKey)) {
        throw new Error(
          "GCP KMS email and private key are missing for the wallet",
        );
      }

      wallet = new GcpKmsWallet({
        keyId: splitResourcePath.cryptoKeyId,
        keyRingId: splitResourcePath.keyRingId,
        keyVersion: splitResourcePath.versionId,
        locationId: splitResourcePath.locationId,
        projectId: splitResourcePath.projectId,

        applicationCredentialEmail: email,
        applicationCredentialPrivateKey: privateKey,
      });
      break;
    }

    case WalletType.local:
      wallet = await getLocalWallet({ chainId, walletAddress });
      break;

    default:
      throw new Error(
        `Wallet with address ${walletAddress} was configured with unknown wallet type ${walletDetails.type}`,
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

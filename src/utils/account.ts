import { StatusCodes } from "http-status-codes";
import type { Address } from "thirdweb";
import type { Account } from "thirdweb/wallets";
import { getWalletDetails } from "../db/wallets/getWalletDetails";
import { WalletType } from "../schema/wallet";
import { createCustomError } from "../server/middleware/error";
import { splitAwsKmsArn } from "../server/utils/wallets/awsKmsArn";
import { getAwsKmsAccount } from "../server/utils/wallets/getAwsKmsAccount";
import { getGcpKmsAccount } from "../server/utils/wallets/getGcpKmsAccount";
import { getLocalWalletAccount } from "../server/utils/wallets/getLocalWallet";
import { getConfig } from "./cache/getConfig";
import { getSmartWalletV5 } from "./cache/getSmartWalletV5";
import { getChain } from "./chain";
import { decrypt } from "./crypto";
import { env } from "./env";
import { thirdwebClient } from "./sdk";

export const _accountsCache = new Map<string, Account>();

export const getAccount = async (args: {
  chainId: number;
  from: Address;
  accountAddress?: Address;
}): Promise<Account> => {
  const { chainId, from, accountAddress } = args;

  // Get from cache.
  const cacheKey = getAccountCacheKey({ chainId, from, accountAddress });
  const cached = _accountsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const walletDetails = await getWalletDetails({
    address: from,
  });

  if (!walletDetails) {
    throw createCustomError(
      `No configured wallet found with address ${from}`,
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }
  const config = await getConfig();

  switch (walletDetails.type) {
    case WalletType.awsKms: {
      const arn = walletDetails.awsKmsArn;

      if (!arn) {
        throw new Error("AWS KMS ARN is missing for the wallet");
      }

      const { keyId, region } = splitAwsKmsArn(arn);

      // try to decrypt the secret access key in walletDetails (if found)
      // otherwise fallback to global config
      const secretAccessKey = walletDetails.awsKmsSecretAccessKey
        ? decrypt(walletDetails.awsKmsSecretAccessKey, env.ENCRYPTION_PASSWORD)
        : config.walletConfiguration.aws?.awsSecretAccessKey;

      if (!secretAccessKey) {
        throw new Error("AWS KMS secret access key is missing for the wallet");
      }

      // try to get the access key id from walletDetails (if found)
      // otherwise fallback to global config
      const accessKeyId =
        walletDetails.awsKmsAccessKeyId ??
        config.walletConfiguration.aws?.awsAccessKeyId;

      if (!accessKeyId) {
        throw new Error("AWS KMS access key id is missing for the wallet");
      }

      return await getAwsKmsAccount({
        client: thirdwebClient,
        keyId,
        config: {
          region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        },
      });
    }
    case WalletType.gcpKms: {
      const resourcePath = walletDetails.gcpKmsResourcePath;
      if (!resourcePath) {
        throw new Error("GCP KMS resource path is missing for the wallet");
      }

      // try to decrypt the application credential private key in walletDetails (if found)
      // otherwise fallback to global config
      const gcpApplicationCredentialPrivateKey =
        walletDetails.gcpApplicationCredentialPrivateKey
          ? decrypt(
              walletDetails.gcpApplicationCredentialPrivateKey,
              env.ENCRYPTION_PASSWORD,
            )
          : config.walletConfiguration.gcp?.gcpApplicationCredentialPrivateKey;

      if (!gcpApplicationCredentialPrivateKey) {
        throw new Error(
          "GCP application credential private key is missing for the wallet",
        );
      }

      // try to get the application credential email from walletDetails (if found)
      // otherwise fallback to global config
      const gcpApplicationCredentialEmail =
        walletDetails.gcpApplicationCredentialEmail ??
        config.walletConfiguration.gcp?.gcpApplicationCredentialEmail;

      if (!gcpApplicationCredentialEmail) {
        throw new Error(
          "GCP application credential email is missing for the wallet",
        );
      }

      return await getGcpKmsAccount({
        client: thirdwebClient,
        name: resourcePath,
        clientOptions: {
          credentials: {
            client_email: gcpApplicationCredentialEmail,
            private_key: gcpApplicationCredentialPrivateKey,
          },
        },
      });
    }
    case WalletType.local: {
      if (accountAddress) {
        const chain = await getChain(chainId);
        const account = await getSmartWalletV5({
          chain,
          accountAddress,
          from,
        });
        _accountsCache.set(cacheKey, account);
        return account;
      }

      const account = await getLocalWalletAccount(from);
      _accountsCache.set(cacheKey, account);
      return account;
    }
    default:
      throw new Error(`Wallet type not supported: ${walletDetails.type}`);
  }
};

const getAccountCacheKey = (args: {
  chainId: number;
  from: Address;
  accountAddress?: Address;
}) =>
  args.accountAddress
    ? `${args.chainId}-${args.from}-${args.accountAddress}`
    : `${args.chainId}-${args.from}`;

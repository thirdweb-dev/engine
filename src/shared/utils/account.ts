import LRUMap from "mnemonist/lru-map";
import { getAddress, type Address, type Chain } from "thirdweb";
import type { Account } from "thirdweb/wallets";
import {
  getWalletDetails,
  isSmartBackendWallet,
  type ParsedWalletDetails,
} from "../db/wallets/get-wallet-details";
import { WalletType } from "../schemas/wallet";
import { splitAwsKmsArn } from "../../server/utils/wallets/aws-kms-arn";
import { getConnectedSmartWallet } from "../../server/utils/wallets/create-smart-wallet";
import { getAwsKmsAccount } from "../../server/utils/wallets/get-aws-kms-account";
import { getGcpKmsAccount } from "../../server/utils/wallets/get-gcp-kms-account";
import { encryptedJsonToAccount } from "../../server/utils/wallets/get-local-wallet";
import { getSmartWalletV5 } from "./cache/get-smart-wallet-v5";
import { getChain } from "./chain";
import { thirdwebClient } from "./sdk";
import type { TransactionCredentials } from "../lib/transaction/transaction-credentials";

export const _accountsCache = new LRUMap<string, Account>(2048);

export const getAccount = async (args: {
  chainId: number;
  from: Address;
  accountAddress?: Address;
  credentials: TransactionCredentials;
}): Promise<Account> => {
  const { chainId, from, accountAddress, credentials } = args;
  const chain = await getChain(chainId);

  if (accountAddress) {
    return getSmartWalletV5({ chain, accountAddress, from });
  }

  // Get from cache.
  const cacheKey = `${chainId}:${from}:${accountAddress ?? "-"}`;
  const cached = _accountsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const walletDetails = await getWalletDetails({
    address: from,
  });

  const { account } = await walletDetailsToAccount({
    walletDetails,
    chain,
    credentials,
  });
  _accountsCache.set(cacheKey, account);
  return account;
};

export const walletDetailsToAccount = async ({
  walletDetails,
  chain,
  credentials,
}: {
  walletDetails: ParsedWalletDetails;
  chain: Chain;
  credentials: TransactionCredentials;
}) => {
  switch (walletDetails.type) {
    case WalletType.awsKms: {
      const { keyId, region } = splitAwsKmsArn(walletDetails.awsKmsArn);

      const account = await getAwsKmsAccount({
        client: thirdwebClient,
        keyId,
        config: {
          region,
          credentials: {
            accessKeyId: walletDetails.awsKmsAccessKeyId,
            secretAccessKey: walletDetails.awsKmsSecretAccessKey,
          },
        },
      });

      return { account };
    }
    case WalletType.gcpKms: {
      const account = await getGcpKmsAccount({
        client: thirdwebClient,
        name: walletDetails.gcpKmsResourcePath,
        clientOptions: {
          credentials: {
            client_email: walletDetails.gcpApplicationCredentialEmail,
            private_key: walletDetails.gcpApplicationCredentialPrivateKey,
          },
        },
      });
      return { account };
    }
    case WalletType.local: {
      return {
        account: await encryptedJsonToAccount(
          walletDetails.encryptedJson,
          credentials.encryptionPassword,
        ),
      };
    }
    case WalletType.smartAwsKms: {
      const { keyId, region } = splitAwsKmsArn(walletDetails.awsKmsArn);

      const adminAccount = await getAwsKmsAccount({
        client: thirdwebClient,
        keyId,
        config: {
          region,
          credentials: {
            accessKeyId: walletDetails.awsKmsAccessKeyId,
            secretAccessKey: walletDetails.awsKmsSecretAccessKey,
          },
        },
      });

      const connectedWallet = await getConnectedSmartWallet({
        adminAccount: adminAccount,
        accountFactoryAddress: walletDetails.accountFactoryAddress ?? undefined,
        entrypointAddress: walletDetails.entrypointAddress ?? undefined,
        chain: chain,
      });

      return { account: connectedWallet, adminAccount: adminAccount };
    }

    case WalletType.smartGcpKms: {
      const adminAccount = await getGcpKmsAccount({
        client: thirdwebClient,
        name: walletDetails.gcpKmsResourcePath,
        clientOptions: {
          credentials: {
            client_email: walletDetails.gcpApplicationCredentialEmail,
            private_key: walletDetails.gcpApplicationCredentialPrivateKey,
          },
        },
      });

      const connectedWallet = await getConnectedSmartWallet({
        adminAccount: adminAccount,
        accountFactoryAddress: walletDetails.accountFactoryAddress ?? undefined,
        entrypointAddress: walletDetails.entrypointAddress ?? undefined,
        chain: chain,
      });

      return { account: connectedWallet, adminAccount };
    }

    case WalletType.smartLocal: {
      const adminAccount = await encryptedJsonToAccount(
        walletDetails.encryptedJson,
        credentials.encryptionPassword,
      );

      const connectedWallet = await getConnectedSmartWallet({
        adminAccount: adminAccount,
        accountFactoryAddress: walletDetails.accountFactoryAddress ?? undefined,
        entrypointAddress: walletDetails.entrypointAddress ?? undefined,
        chain: chain,
      });

      return { account: connectedWallet, adminAccount };
    }
    default:
      throw new Error(`Wallet type not supported: ${walletDetails.type}`);
  }
};

export const _adminAccountsCache = new LRUMap<string, Account>(2048);

/**
 * Get the admin account for a smart backend wallet (cached)
 * Will throw if the wallet is not a smart backend wallet
 */
export const getSmartBackendWalletAdminAccount = async ({
  chainId,
  accountAddress,
  credentials,
}: {
  chainId: number;
  accountAddress: Address;
  credentials: TransactionCredentials;
}): Promise<Account> => {
  const chain = await getChain(chainId);

  // Get from cache.
  const cacheKey = `${chainId}:${accountAddress}`;
  const cached = _adminAccountsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const walletDetails = await getWalletDetails({
    address: accountAddress,
  });
  if (!isSmartBackendWallet(walletDetails)) {
    throw new Error("Cannot get admin account for a non-Smart Backend Wallet.");
  }

  const { adminAccount } = await walletDetailsToAccount({
    walletDetails,
    chain,
    credentials,
  });

  if (!adminAccount) {
    // todo: error improvement, make it easy to parse whether user error or system error
    throw new Error("Unexpected error: admin account not found");
  }

  _adminAccountsCache.set(cacheKey, adminAccount);
  return adminAccount;
};

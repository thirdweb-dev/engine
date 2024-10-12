import { getAddress, type Address } from "thirdweb";
import { smartWallet, type Account } from "thirdweb/wallets";
import { getWalletDetails } from "../db/wallets/getWalletDetails";
import { WalletType } from "../schema/wallet";
import { splitAwsKmsArn } from "../server/utils/wallets/awsKmsArn";
import { getAwsKmsAccount } from "../server/utils/wallets/getAwsKmsAccount";
import { getGcpKmsAccount } from "../server/utils/wallets/getGcpKmsAccount";
import { getLocalWalletAccount } from "../server/utils/wallets/getLocalWallet";
import { getSmartWalletV5 } from "./cache/getSmartWalletV5";
import { getChain } from "./chain";
import { thirdwebClient } from "./sdk";

export const _accountsCache = new Map<string, Account>();

export const getAccount = async (args: {
  chainId: number;
  from: Address;
  accountAddress?: Address;
}): Promise<Account> => {
  const { chainId, from, accountAddress } = args;
  const chain = await getChain(chainId);

  if (accountAddress) return getSmartWalletV5({ chain, accountAddress, from });

  // Get from cache.
  const cacheKey = getAccountCacheKey({ chainId, from, accountAddress });
  const cached = _accountsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const walletDetails = await getWalletDetails({
    address: from,
  });

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

      _accountsCache.set(cacheKey, account);
      return account;
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
      _accountsCache.set(cacheKey, account);
      return account;
    }
    case WalletType.local: {
      const account = await getLocalWalletAccount(from);
      _accountsCache.set(cacheKey, account);
      return account;
    }
    case WalletType.smartAwsKms: {
      const { keyId, region } = splitAwsKmsArn(walletDetails.awsKmsArn);

      const signerAccount = await getAwsKmsAccount({
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

      const unconnectedSmartWallet = smartWallet({
        chain: await getChain(chainId),
        sponsorGas: true,
        factoryAddress: walletDetails.accountFactoryAddress ?? undefined,
      });

      const account = await unconnectedSmartWallet.connect({
        client: thirdwebClient,
        personalAccount: signerAccount,
      });

      _accountsCache.set(cacheKey, account);
      return account;
    }

    case WalletType.smartGcpKms: {
      const signerAccount = await getGcpKmsAccount({
        client: thirdwebClient,
        name: walletDetails.gcpKmsResourcePath,
        clientOptions: {
          credentials: {
            client_email: walletDetails.gcpApplicationCredentialEmail,
            private_key: walletDetails.gcpApplicationCredentialPrivateKey,
          },
        },
      });

      const unconnectedSmartWallet = smartWallet({
        chain: await getChain(chainId),
        sponsorGas: true,
        factoryAddress: walletDetails.accountFactoryAddress ?? undefined,
      });

      const account = await unconnectedSmartWallet.connect({
        client: thirdwebClient,
        personalAccount: signerAccount,
      });

      _accountsCache.set(cacheKey, account);
      return account;
    }

    case WalletType.smartLocal: {
      const adminAccount = await getAccount({
        chainId,
        from: getAddress(walletDetails.accountSignerAddress),
      });

      const unconnectedSmartWallet = smartWallet({
        chain: await getChain(chainId),
        sponsorGas: true,
        factoryAddress: walletDetails.accountFactoryAddress ?? undefined,
      });

      const account = await unconnectedSmartWallet.connect({
        client: thirdwebClient,
        personalAccount: adminAccount,
      });
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

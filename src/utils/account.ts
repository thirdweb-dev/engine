import { EVMWallet } from "@thirdweb-dev/wallets";
import { Address } from "thirdweb";
import { ethers5Adapter } from "thirdweb/adapters/ethers5";
import { Account } from "thirdweb/wallets";
import { getWalletDetails } from "../db/wallets/getWalletDetails";
import { WalletType } from "../schema/wallet";
import { getAwsKmsWallet } from "../server/utils/wallets/getAwsKmsWallet";
import { getGcpKmsWallet } from "../server/utils/wallets/getGcpKmsWallet";
import { getLocalWallet } from "../server/utils/wallets/getLocalWallet";

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
    throw new Error(`Backend wallet not found: ${from}`);
  }

  let wallet: EVMWallet;
  switch (walletDetails.type) {
    case WalletType.awsKms:
      wallet = await getAwsKmsWallet({
        awsKmsKeyId: walletDetails.awsKmsKeyId!,
      });
      break;
    case WalletType.gcpKms:
      wallet = await getGcpKmsWallet({
        gcpKmsKeyId: walletDetails.gcpKmsKeyId!,
        gcpKmsKeyVersionId: walletDetails.gcpKmsKeyVersionId!,
      });
      break;
    case WalletType.local:
      wallet = await getLocalWallet({ chainId, walletAddress: from });
      break;
    default:
      throw new Error(`Wallet type not supported: ${walletDetails.type}`);
  }

  const signer = await wallet.getSigner();
  const account = await ethers5Adapter.signer.fromEthers({ signer });

  // Set cache.
  _accountsCache.set(cacheKey, account);
  return account;
};

const getAccountCacheKey = (args: {
  chainId: number;
  from: Address;
  accountAddress?: Address;
}) =>
  args.accountAddress
    ? `${args.chainId}-${args.from}-${args.accountAddress}`
    : `${args.chainId}-${args.from}`;

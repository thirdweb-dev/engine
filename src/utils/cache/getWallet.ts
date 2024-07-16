import { EVMWallet } from "@thirdweb-dev/wallets";
import { getWalletDetails } from "../../db/wallets/getWalletDetails";
import { PrismaTransaction } from "../../schema/prisma";
import { WalletType } from "../../schema/wallet";
import { getAwsKmsWallet } from "../../server/utils/wallets/getAwsKmsWallet";
import { getGcpKmsWallet } from "../../server/utils/wallets/getGcpKmsWallet";
import { getLocalWallet } from "../../server/utils/wallets/getLocalWallet";
import { getSmartBackendWallet } from "../../server/utils/wallets/getSmartBackendWallet";
import { Account, smartWallet } from "thirdweb/wallets";
import { defineChain } from "thirdweb";

export const walletsCache = new Map<string, EVMWallet>();
export const accountCache = new Map<string, Account>();

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
}: GetWalletParams): Promise<TWallet | Account> => {
  const cacheKey = accountAddress
    ? `${chainId}-${walletAddress}-${accountAddress}`
    : `${chainId}-${walletAddress}`;
  if (walletsCache.has(cacheKey)) {
    return walletsCache.get(cacheKey)! as TWallet;
  }

  const walletDetails = await getWalletDetails({
    pgtx,
    address: walletAddress,
  });

  if (!walletDetails) {
    throw new Error(`No configured wallet found with address ${walletAddress}`);
  }

  let wallet: EVMWallet | undefined;
  let account: Account | undefined;
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
      wallet = await getLocalWallet({ chainId, walletAddress });
      break;
    case WalletType.smart:
      account = await getSmartBackendWallet({ chainId, walletAddress });
      break;

    default:
      throw new Error(
        `Wallet with address ${walletAddress} was configured with unknown wallet type ${walletDetails.type}`,
      );
  }

  if (account) {
    accountCache.set(cacheKey, account);
    return account;
  }

  if (wallet) {
    // If no account is specified, use the backend wallet itself
    walletsCache.set(cacheKey, wallet);
    return wallet as TWallet;
  }

  throw new Error(`No wallet found for address ${walletAddress}`);
};

import { EVMWallet } from "@thirdweb-dev/wallets";
import { getWalletDetails } from "../../db/wallets/getWalletDetails";
import { WalletType } from "../../schema/wallet";
import { getAwsKmsWallet } from "../../server/utils/wallets/getAwsKmsWallet";
import { getGcpKmsWallet } from "../../server/utils/wallets/getGcpKmsWallet";
import { getLocalWallet } from "../../server/utils/wallets/getLocalWallet";
import { getSmartWallet } from "../../server/utils/wallets/getSmartWallet";

export const walletsCache = new Map<string, EVMWallet>();

interface GetWalletParams {
  chainId: number;
  walletAddress: string;
  accountAddress?: string;
}

export const getWallet = async <TWallet extends EVMWallet>({
  chainId,
  walletAddress,
  accountAddress,
}: GetWalletParams): Promise<TWallet> => {
  const cacheKey = accountAddress
    ? `${chainId}-${walletAddress}-${accountAddress}`
    : `${chainId}-${walletAddress}`;
  if (walletsCache.has(cacheKey)) {
    return walletsCache.get(cacheKey)! as TWallet;
  }

  const walletDetails = await getWalletDetails({
    address: walletAddress,
  });

  if (!walletDetails) {
    throw new Error(`No configured wallet found with address ${walletAddress}`);
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

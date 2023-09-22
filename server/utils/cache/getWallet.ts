import { EVMWallet, EthersWallet } from "@thirdweb-dev/wallets";
import { getAwsKmsWallet } from "../../../server/utils/wallets/getAwsKmsWallet";
import { getGcpKmsSigner } from "../../../server/utils/wallets/getGcpKmsSigner";
import { getLocalWallet } from "../../../server/utils/wallets/getLocalWallet";
import { getBackendWallet } from "../../../src/db/wallets/getBackendWallet";
import { PrismaTransaction } from "../../../src/schema/prisma";
import { WalletType } from "../../../src/schema/wallet";
import { getSmartWallet } from "../wallets/getSmartWallet";

const walletsCache = new Map<string, EVMWallet>();

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
  if (walletsCache.has(cacheKey)) {
    return walletsCache.get(cacheKey)! as TWallet;
  }

  const backendWallet = await getBackendWallet({
    pgtx,
    address: walletAddress,
  });

  if (!backendWallet) {
    throw new Error(`No configured wallet found with address ${walletAddress}`);
  }

  let wallet: EVMWallet;
  switch (backendWallet.type) {
    case WalletType.awsKms:
      wallet = getAwsKmsWallet({
        awsKmsKeyId: backendWallet.awsKmsKeyId!,
      });
      break;
    case WalletType.gcpKms:
      const signer = getGcpKmsSigner({
        gcpKmsKeyId: backendWallet.gcpKmsKeyId!,
        gcpKmsKeyVersionId: backendWallet.gcpKmsKeyVersionId!,
      });
      wallet = new EthersWallet(signer);
      break;
    case WalletType.local:
      wallet = await getLocalWallet({ chainId, walletAddress });
      break;
    default:
      throw new Error(
        `Wallet with address ${walletAddress} was configured with unknown wallet type ${backendWallet.type}`,
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

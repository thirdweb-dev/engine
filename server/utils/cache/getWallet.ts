import {
  AbstractWallet,
  EthersWallet,
  LocalWallet,
} from "@thirdweb-dev/wallets";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { getAwsKmsWallet } from "../../../server/utils/wallets/getAwsKmsWallet";
import { getGcpKmsSigner } from "../../../server/utils/wallets/getGcpKmsSigner";
import { getLocalWallet } from "../../../server/utils/wallets/getLocalWallet";
import { getWalletDetails } from "../../../src/db/wallets/getWalletDetails";
import { PrismaTransaction } from "../../../src/schema/prisma";
import { WalletType } from "../../../src/schema/wallet";

const walletsCache = new Map<string, AbstractWallet>();

interface GetWalletParams<TWallet extends WalletType> {
  pgtx?: PrismaTransaction;
  chainId: number;
  walletAddress: string;
  walletType?: TWallet;
}

type EnforceWalletType<TWallet extends WalletType> =
  TWallet extends WalletType.awsKms
    ? AwsKmsWallet
    : TWallet extends WalletType.gcpKms
    ? EthersWallet
    : TWallet extends WalletType.local
    ? LocalWallet
    : AbstractWallet;

export const getWallet = async <TWallet extends WalletType>({
  pgtx,
  chainId,
  walletAddress,
  walletType,
}: GetWalletParams<TWallet>): Promise<EnforceWalletType<TWallet>> => {
  const cacheKey = `${chainId}-${walletAddress}`;
  if (walletsCache.has(cacheKey)) {
    return walletsCache.get(cacheKey)! as EnforceWalletType<TWallet>;
  }

  const walletDetails = await getWalletDetails({
    pgtx,
    address: walletAddress,
  });

  if (!walletDetails) {
    throw new Error(`No configured wallet found with address ${walletAddress}`);
  }

  if (!!walletType && walletType !== walletDetails.type) {
    throw new Error(
      `Tried to access wallet ${walletAddress} as type ${walletType} but wallet was configured as type ${walletDetails.type}`,
    );
  }

  let wallet: AbstractWallet;
  switch (walletDetails.type) {
    case WalletType.awsKms:
      wallet = await getAwsKmsWallet({
        awsKmsKeyId: walletDetails.awsKmsKeyId!,
      });
      break;
    case WalletType.gcpKms:
      const signer = await getGcpKmsSigner({
        gcpKmsKeyId: walletDetails.gcpKmsKeyId!,
        gcpKmsKeyVersionId: walletDetails.gcpKmsKeyVersionId!,
      });
      wallet = new EthersWallet(signer);
      break;
    case WalletType.local:
      wallet = await getLocalWallet({ chainId, walletAddress });
      break;
    default:
      throw new Error(
        `Wallet with address ${walletAddress} was configured with unknown wallet type ${walletDetails.type}`,
      );
  }

  walletsCache.set(cacheKey, wallet);

  return wallet as EnforceWalletType<TWallet>;
};

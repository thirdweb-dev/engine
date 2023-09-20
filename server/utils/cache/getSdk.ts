import { getChainByChainId } from "@thirdweb-dev/chains";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { PrismaTransaction } from "../../../src/schema/prisma";
import { env } from "../../../src/utils/env";
import { getWallet } from "./getWallet";

const sdkCache = new Map<string, ThirdwebSDK>();

interface GetSdkParams {
  pgtx?: PrismaTransaction;
  chainId: number;
  walletAddress?: string;
}

export const getSdk = async ({
  pgtx,
  chainId,
  walletAddress,
}: GetSdkParams): Promise<ThirdwebSDK> => {
  const cacheKey = walletAddress ? `${chainId}-${walletAddress}` : `${chainId}`;
  if (sdkCache.has(cacheKey)) {
    return sdkCache.get(cacheKey)!;
  }

  const chain = getChainByChainId(chainId);

  let sdk: ThirdwebSDK;
  if (!walletAddress) {
    sdk = new ThirdwebSDK(chain, {
      secretKey: env.THIRDWEB_API_SECRET_KEY,
    });
  } else {
    const wallet = await getWallet({ pgtx, chainId, walletAddress });
    sdk = await ThirdwebSDK.fromWallet(wallet, chain, {
      secretKey: env.THIRDWEB_API_SECRET_KEY,
    });
  }

  sdkCache.set(cacheKey, sdk);
  return sdk;
};

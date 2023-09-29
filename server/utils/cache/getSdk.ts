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
  accountAddress?: string;
}

export const getSdk = async ({
  pgtx,
  chainId,
  walletAddress,
  accountAddress,
}: GetSdkParams): Promise<ThirdwebSDK> => {
  const cacheKey = walletAddress
    ? accountAddress
      ? `${chainId}-${walletAddress}-${accountAddress}`
      : `${chainId}-${walletAddress}`
    : `${chainId}`;
  if (sdkCache.has(cacheKey)) {
    return sdkCache.get(cacheKey)!;
  }

  const chain = getChainByChainId(chainId);

  let sdk: ThirdwebSDK;
  if (!walletAddress) {
    sdk = new ThirdwebSDK(chain, {
      secretKey: env.THIRDWEB_API_SECRET_KEY,
      supportedChains: env.CHAIN_OVERRIDES
        ? JSON.parse(env.CHAIN_OVERRIDES)
        : undefined,
    });
  } else {
    const wallet = await getWallet({
      pgtx,
      chainId,
      walletAddress,
      accountAddress,
    });
    sdk = await ThirdwebSDK.fromWallet(wallet, chain, {
      secretKey: env.THIRDWEB_API_SECRET_KEY,
      supportedChains: env.CHAIN_OVERRIDES
        ? JSON.parse(env.CHAIN_OVERRIDES)
        : undefined,
    });
  }

  sdkCache.set(cacheKey, sdk);
  return sdk;
};

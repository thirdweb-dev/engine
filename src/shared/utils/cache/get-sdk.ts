import { Type } from "@sinclair/typebox";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { getChainMetadata } from "thirdweb/chains";
import { badChainError } from "../../../server/middleware/error.js";
import { getChain } from "../chain.js";
import { env } from "../env.js";
import { getWallet } from "./get-wallet.js";
import { LRUCache } from "lru-cache";

export const sdkCache = new LRUCache<string, ThirdwebSDK>({ max: 2048 });

export const networkResponseSchema = Type.Object({
  name: Type.String({
    description: "Chain name",
  }),
  chain: Type.String({
    description: "Chain name",
  }),
  rpc: Type.Array(
    Type.String({
      description: "RPC URL",
    }),
  ),
  nativeCurrency: Type.Object({
    name: Type.String({
      description: "Native currency name",
    }),
    symbol: Type.String({
      description: "Native currency symbol",
    }),
    decimals: Type.Integer({
      description: "Native currency decimals",
    }),
  }),
  shortName: Type.String({
    description: "Chain short name",
  }),
  chainId: Type.Integer({
    description: "Chain ID",
  }),
  testnet: Type.Boolean({
    description: "Is testnet",
  }),
  slug: Type.String({
    description: "Chain slug",
  }),
});

interface GetSdkParams {
  chainId: number;
  walletAddress?: string;
  accountAddress?: string;
}

export const getSdk = async ({
  chainId,
  walletAddress,
  accountAddress,
}: GetSdkParams): Promise<ThirdwebSDK> => {
  const cacheKey = walletAddress
    ? accountAddress
      ? `${chainId}-${walletAddress}-${accountAddress}`
      : `${chainId}-${walletAddress}`
    : `${chainId}`;

  const cached = sdkCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const chainV5 = await getChain(chainId);
  const chain = await getChainMetadata(chainV5);
  if (!chain) {
    // TODO: move this out of a utils function.
    throw badChainError(chainId);
  }

  let sdk: ThirdwebSDK;
  if (!walletAddress) {
    sdk = new ThirdwebSDK(chain, {
      secretKey: env.THIRDWEB_API_SECRET_KEY,
      supportedChains: [{ ...chain, rpc: [...chain.rpc] }],
      rpcBatchSettings: {
        sizeLimit: env.SDK_BATCH_SIZE_LIMIT,
        timeLimit: env.SDK_BATCH_TIME_LIMIT,
      },
    });
  } else {
    const wallet = await getWallet({
      chainId,
      walletAddress,
      accountAddress,
    });
    sdk = await ThirdwebSDK.fromWallet(wallet, chainId, {
      secretKey: env.THIRDWEB_API_SECRET_KEY,
      supportedChains: [{ ...chain, rpc: [...chain.rpc] }],
      rpcBatchSettings: {
        sizeLimit: env.SDK_BATCH_SIZE_LIMIT,
        timeLimit: env.SDK_BATCH_TIME_LIMIT,
      },
    });
  }

  sdkCache.set(cacheKey, sdk);
  return sdk;
};

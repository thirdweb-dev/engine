import { Static, Type } from "@sinclair/typebox";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import { NetworkInput, ThirdwebSDK } from "@thirdweb-dev/sdk";
import * as fs from "fs";
import { PrismaTransaction } from "../../schema/prisma";
import { isValidHttpUrl } from "../../server/utils/validator";
import { JsonSchema, env } from "../env";
import { getConfig } from "./getConfig";
import { getWallet } from "./getWallet";

export const sdkCache = new Map<string, ThirdwebSDK>();

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
    decimals: Type.Number({
      description: "Native currency decimals",
    }),
  }),
  shortName: Type.String({
    description: "Chain short name",
  }),
  chainId: Type.Number({
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

  let RPC_OVERRIDES: Static<typeof networkResponseSchema>[] = [];
  const config = await getConfig();
  const CHAIN_OVERRIDES = config.chainOverrides;

  if (sdkCache.has(cacheKey)) {
    return sdkCache.get(cacheKey)!;
  }

  let chain: NetworkInput | undefined = undefined;
  try {
    chain = await getChainByChainIdAsync(chainId);
  } catch (error) {
    console.log("failed to get the chain");
  }

  if (CHAIN_OVERRIDES) {
    if (JsonSchema.safeParse(CHAIN_OVERRIDES).success) {
      RPC_OVERRIDES = JSON.parse(CHAIN_OVERRIDES);
    } else if (isValidHttpUrl(CHAIN_OVERRIDES)) {
      const result = await fetch(CHAIN_OVERRIDES);
      RPC_OVERRIDES = await result.json();
    } else {
      const text = fs.readFileSync(CHAIN_OVERRIDES, "utf8");
      RPC_OVERRIDES = JSON.parse(text);
    }

    const parsedChainOverrides = JSON.parse(CHAIN_OVERRIDES);
    const overrideChain = parsedChainOverrides.find(
      (chainData: Static<typeof networkResponseSchema>) =>
        chainData.chainId === chainId,
    );

    if (overrideChain) {
      chain = overrideChain;
    }
  }

  if (!chain) {
    throw new Error(
      `Invalid chain ${chainId}, please use a different value or provide Chain Override Data.`,
    );
  }

  let sdk: ThirdwebSDK;
  if (!walletAddress) {
    sdk = new ThirdwebSDK(chain!, {
      secretKey: env.THIRDWEB_API_SECRET_KEY,
      supportedChains: config.chainOverrides ? RPC_OVERRIDES : undefined,
      rpcBatchSettings: {
        sizeLimit: env.SDK_BATCH_SIZE_LIMIT,
        timeLimit: env.SDK_BATCH_TIME_LIMIT,
      },
    });
  } else {
    const wallet = await getWallet({
      pgtx,
      chainId,
      walletAddress,
      accountAddress,
    });
    sdk = await ThirdwebSDK.fromWallet(wallet, chainId, {
      secretKey: env.THIRDWEB_API_SECRET_KEY,
      supportedChains: config.chainOverrides ? RPC_OVERRIDES : undefined,
      rpcBatchSettings: {
        sizeLimit: env.SDK_BATCH_SIZE_LIMIT,
        timeLimit: env.SDK_BATCH_TIME_LIMIT,
      },
    });
  }

  sdkCache.set(cacheKey, sdk);
  return sdk;
};

import { Static, Type } from "@sinclair/typebox";
import { getChainByChainId } from "@thirdweb-dev/chains";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import * as fs from "fs";
import { getConfiguration } from "../../../src/db/configuration/getConfiguration";
import { PrismaTransaction } from "../../../src/schema/prisma";
import { JsonSchema, env } from "../../../src/utils/env";
import { isValidHttpUrl } from "../validator";
import { getWallet } from "./getWallet";

const sdkCache = new Map<string, ThirdwebSDK>();

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
  const config = await getConfiguration();
  const CHAIN_OVERRIDES = config.chainOverrides;

  if (sdkCache.has(cacheKey)) {
    return sdkCache.get(cacheKey)!;
  }

  const chain = getChainByChainId(chainId);

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
  }

  let sdk: ThirdwebSDK;
  if (!walletAddress) {
    sdk = new ThirdwebSDK(chain, {
      secretKey: env.THIRDWEB_API_SECRET_KEY,
      supportedChains: config.chainOverrides ? RPC_OVERRIDES : undefined,
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
      supportedChains: config.chainOverrides ? RPC_OVERRIDES : undefined,
    });
  }

  sdkCache.set(cacheKey, sdk);
  return sdk;
};

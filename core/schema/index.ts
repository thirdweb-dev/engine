import { Type } from "@sinclair/typebox";

export const chainResponseSchema = Type.Object({
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

export const walletAuthSchema = Type.Object({
  "x-backend-wallet-address": Type.String({
    description: "Backend wallet address",
  }),
  "x-account-address": Type.Optional(
    Type.String({
      description: "Smart account address",
    }),
  ),
});

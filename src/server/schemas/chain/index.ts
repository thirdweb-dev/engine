import { Type } from "@sinclair/typebox";

export const chainIdOrSlugSchema = Type.RegExp(/^[\w-]{1,50}$/, {
  description: `A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.`,
  examples: ["80002"],
});

export const chainRequestQuerystringSchema = Type.Object({
  chain: chainIdOrSlugSchema,
});

export const chainResponseSchema = Type.Partial(
  Type.Object({
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
    chainId: Type.Integer({
      description: "Chain ID",
    }),
    testnet: Type.Boolean({
      description: "Is testnet",
    }),
    slug: Type.String({
      description: "Chain slug",
    }),
  }),
);

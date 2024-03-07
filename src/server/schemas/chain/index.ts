import { Type } from "@sinclair/typebox";
import { allChains } from "@thirdweb-dev/chains";

export const chainRequestQuerystringSchema = Type.Object({
  chain: Type.String({
    description: "Chain name or id",
    examples: allChains.map((chain) => chain.slug),
  }),
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
    chainId: Type.Number({
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

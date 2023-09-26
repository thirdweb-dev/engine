import { Type } from "@sinclair/typebox";
import { allChains } from "@thirdweb-dev/chains";

export const chainRequestQuerystringSchema = Type.Object({
  chain: Type.String({
    description: "Chain name or id",
    examples: allChains.map((chain) => chain.slug),
  }),
});

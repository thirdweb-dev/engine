import { Type } from "@sinclair/typebox";
import { allChains } from "@thirdweb-dev/chains";

export const networkRequestQuerystringSchema = Type.Object({
  network: Type.String({
    description: "Network name or id",
    examples: allChains.map((chain) => chain.slug),
  }),
});

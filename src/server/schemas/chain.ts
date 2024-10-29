import { Type } from "@sinclair/typebox";

export const chainIdOrSlugSchema = Type.RegExp(/^[\w-]{1,50}$/, {
  description: `A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.`,
  examples: ["80002"],
});

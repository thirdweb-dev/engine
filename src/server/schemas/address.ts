import { Type } from "@sinclair/typebox";

/**
 * An EVM address schema. Override the description like this:
 *
 * ```typescript
 *   to: {
 *      ...AddressSchema,
 *      description: "The recipient wallet address.",
 *    },
 * ```
 */
export const AddressSchema = Type.RegExp(/^0x[a-fA-F0-9]{40}$/, {
  description: "A contract or wallet address",
  examples: ["0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4"],
});

export const TransactionHashSchema = Type.RegExp(/^0x[a-fA-F0-9]{64}$/, {
  description: "A transaction hash",
  examples: [
    "0x1f31b57601a6f90312fd5e57a2924bc8333477de579ee37b197a0681ab438431",
  ],
});

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

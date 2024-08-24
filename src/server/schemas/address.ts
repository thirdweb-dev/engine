import { Type } from "@sinclair/typebox";
import { ZERO_ADDRESS } from "thirdweb";

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
  examples: [ZERO_ADDRESS],
});

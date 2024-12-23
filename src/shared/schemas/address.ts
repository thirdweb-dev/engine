import { getAddress } from "thirdweb";
import * as z from "zod";

/**
 * Use the Zod schema to validate the EVM address.
 * Uses getAddress from thirdweb/utils to validate the address.
 */
export const zodEvmAddressSchema = z.string().transform((address, ctx) => {
  try {
    return getAddress(address);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid EVM address format",
    });
    return z.NEVER;
  }
});

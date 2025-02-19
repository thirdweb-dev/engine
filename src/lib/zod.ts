import { getAddress, type Address } from "thirdweb";
import * as z from "zod";

/**
 * Use the Zod schema to validate the EVM address.
 * Uses getAddress from thirdweb/utils to validate the address.
 */
export const zodEvmAddressSchema = z
  .string()
  .superRefine((address, ctx): Address => {
    try {
      return getAddress(address);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid EVM address format",
      });
      return z.NEVER;
    }
  })
  .openapi({
    description: "EVM address in hex format",
    example: "0xeb0effdfb4dc5b3d5d3ac6ce29f3ed213e95d675",
  });

export const timestampsSchema = z.object({
  createdAt: z.string().openapi({
    description: "The timestamp of when this entity was created",
    example: "2023-01-01T00:00:00.000Z",
  }),
  updatedAt: z.string().openapi({
    description: "The timestamp of when the entity was last updated",
    example: "2023-01-01T00:00:00.000Z",
  }),
});

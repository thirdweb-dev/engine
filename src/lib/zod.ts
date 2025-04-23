import { getAddress, type Address, type Hex } from "thirdweb";
import * as z from "zod";

/**
 * Use the Zod schema to validate the EVM address.
 * Uses getAddress from thirdweb/utils to validate the address.
 */
export const exampleEvmAddress =
  "0xeb0effdfb4dc5b3d5d3ac6ce29f3ed213e95d675" as const;

export const exampleBaseSepoliaUsdcAddress =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

export const evmAddressSchema = z
  .string()
  .superRefine((address, ctx): address is Address => {
    try {
      getAddress(address);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid EVM address format",
      });
    }
    return z.NEVER;
  })
  .openapi({
    description: "EVM address in hex format",
    example: exampleEvmAddress,
  });

export const hexSchema = z.string().regex(/^0x[0-9a-fA-F]+$/) as z.ZodType<Hex>;

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

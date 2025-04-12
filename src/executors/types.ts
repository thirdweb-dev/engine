import * as z from "zod";
import { hexSchema, evmAddressSchema } from "../lib/zod.js";
import { wrapResponseSchema } from "../server/schemas/shared-api-schemas.js";
import { transactionDbEntrySchema } from "../db/derived-schemas.js";

// Example BigInt value for OpenAPI documentation
const exampleBigInt = "123456789012345678901234567890";

export const bigIntSchema = z
  .string()
  .refine(
    (value) => {
      try {
        // Check if the string is a valid integer (no decimals, letters, etc.)
        // and can be converted to a BigInt
        BigInt(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "Input must be a valid integer string convertible to BigInt",
    },
  )
  .transform((value) => BigInt(value)) // Transform the string to BigInt
  .openapi({
    description:
      "A string representing an integer that is transformed into a BigInt",
    example: exampleBigInt,
    type: "string", // OpenAPI type (input is still a string)
    format: "bigint", // Custom format to indicate it's a BigInt
  });

export const serialisedBigIntSchema = z.string().openapi({
  description:
    "A string representing an bigint response, safe to parse with BigInt",
  example: exampleBigInt,
  type: "string", // OpenAPI type (input is still a string)
  format: "bigint", // Custom format to indicate it's a BigInt
});

export const transactionBodySchema = z.object({
  to: evmAddressSchema.optional().openapi({
    description: "The address of the contract to send the transaction to",
  }),
  data: hexSchema
    .openapi({
      description: "The data of the transaction",
    })
    .optional(),
  value: bigIntSchema.optional().openapi({
    description: "The value of the transaction",
  }),
});

// AA Execution Options
const baseAAExecutionOptionsSchema = z.object({
  type: z.literal("AA"),
  signerAddress: evmAddressSchema.openapi({
    description:
      "The address of the engine managed account which can send transactions from your smart account",
  }),
  sponsorGas: z.boolean().default(true),
  factoryAddress: evmAddressSchema.optional().openapi({
    description:
      "The address of the smart account factory. Defaults to thirdweb default v0.7 Account Factory. Only specify this if you are using a custom account factory.",
  }),
  entrypointAddress: evmAddressSchema.optional().openapi({
    description:
      "The address of the entrypoint contract. Defaults to the v0.7 entrypoint for the chain. Only specify this if you want to specify a different version.",
  }),
});

// to know the smart account address, we can be directly told the address,
const executionOptionsWithSaltSchema = baseAAExecutionOptionsSchema.extend({
  smartAccountAddress: evmAddressSchema.openapi({
    description:
      "The address of the smart account to send the transaction from",
  }),
});

// or we can be told the salt + factory
const executionOptionsWithoutSaltSchema = baseAAExecutionOptionsSchema.extend({
  accountSalt: z.string().optional().openapi({
    description:
      "The salt of the smart account to send the transaction from. Only specify this if you want to specify a custom salt. If omitted, and smart account address is not provided, the inferred smart account will be with null salt. If a smart account address is provided, the salt will be ignored.",
  }),
});

const baseExecutionRequestSchema = z.object({
  idempotencyKey: z
    .string()
    .openapi({
      description:
        "The idempotency key of the transaction. Transaction requests sent with the same idempotency key will be deduplicated.",
    })
    .optional(),
  vaultAccessToken: z.string().optional().openapi({
    description:
      "Access token to your EOA secured by Vault. Engine will not store this token, and will only use it to send transactions. Only provide this if your EOA is secured by Vault.",
  }),
  chainId: z.string().openapi({
    description: "The chain id of the transaction",
  }),
});

const aaExecutionRequestSchema = z.union([
  executionOptionsWithSaltSchema,
  executionOptionsWithoutSaltSchema,
]);

const specificExecutionRequestSchema = z.object({
  executionOptions: aaExecutionRequestSchema.openapi({
    description: `Instead of providing a "from" address, you can provide specific overrides for your execution. Use this if your smart account is not engine managed, but your engine managed EOA has the permission to send transactions from it.`,
  }),
});

const vagueExecutionRequestSchema = z.object({
  from: evmAddressSchema.openapi({
    description:
      "The address of the account to send the transaction from. Can be the address of a smart account or an EOA.",
  }),
});

/**
 * Builds a schema for an execution request.
 * Takes a schema for the shape of your transaction parameters, and returns a schema for an execution request.
 * Optionally allows extending the final schema with additional fields.
 *
 * @param transactionParamsSchema - The schema of the transaction parameters.
 * @param extensionSchema - An optional ZodObject schema to merge into both branches of the final union schema.
 * @returns A schema for an execution request, potentially extended.
 */
export function buildExecutionRequestSchema<
  T extends z.ZodSchema,
  // biome-ignore lint/complexity/noBannedTypes: sorry, we must
  E extends z.ZodRawShape = {}, // Default to empty shape if no extension
>(
  transactionParamsSchema: T,
  extensionSchema: z.ZodObject<E> = z.object({}) as z.ZodObject<E>,
): // // Return type reflects the union of two objects, each extended with Base, TxParams, and Extension
z.ZodUnion<
  [
    z.ZodObject<
      z.objectUtil.extendShape<
        // 3. Extend with Extension shape E
        z.objectUtil.extendShape<
          // 2. Extend with Base shape
          z.objectUtil.extendShape<
            // 1. Start with Specific shape
            (typeof specificExecutionRequestSchema)["shape"],
            { transactionParams: T } // Add transactionParams schema T
          >,
          (typeof baseExecutionRequestSchema)["shape"]
        >,
        E // Shape from extensionSchema
      >
    >,
    z.ZodObject<
      z.objectUtil.extendShape<
        // 3. Extend with Extension shape E
        z.objectUtil.extendShape<
          // 2. Extend with Base shape
          z.objectUtil.extendShape<
            // 1. Start with Vague shape
            (typeof vagueExecutionRequestSchema)["shape"],
            { transactionParams: T } // Add transactionParams schema T
          >,
          (typeof baseExecutionRequestSchema)["shape"]
        >,
        E // Shape from extensionSchema
      >
    >,
  ]
> {
  // 1. Merge transactionParams and base schema into the specific branch
  const specificExtended = specificExecutionRequestSchema
    .merge(z.object({ transactionParams: transactionParamsSchema }))
    .merge(baseExecutionRequestSchema);

  // 2. Merge transactionParams and base schema into the vague branch
  const vagueExtended = vagueExecutionRequestSchema
    .merge(z.object({ transactionParams: transactionParamsSchema }))
    .merge(baseExecutionRequestSchema);

  // 3. Apply the optional extension schema to *both* branches
  const specificFinal = specificExtended.merge(extensionSchema);
  const vagueFinal = vagueExtended.merge(extensionSchema);

  // 4. Create the union of the two fully formed and potentially extended branches
  // We cast the result to the explicitly defined complex return type for external type safety.
  return z.union([specificFinal, vagueFinal]) as z.ZodUnion<
    [typeof specificFinal, typeof vagueFinal]
  >;
}

export const encodedExecutionRequestSchema = buildExecutionRequestSchema(
  z.array(transactionBodySchema),
);

export type EncodedExecutionRequest = z.infer<
  typeof encodedExecutionRequestSchema
>;

export const transactionResponseSchema = wrapResponseSchema(
  z.object({
    transactions: z.array(transactionDbEntrySchema),
  }),
);

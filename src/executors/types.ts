import * as z from "zod";
import { hexSchema, evmAddressSchema } from "../lib/zod";
import { wrapResponseSchema } from "../server/schemas/shared-api-schemas";
import { transactionDbEntrySchema } from "../db/derived-schemas";

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
    }
  )
  .transform((value) => BigInt(value)) // Transform the string to BigInt
  .openapi({
    description:
      "A string representing an integer that is transformed into a BigInt",
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
  encryptionPassword: z.string().optional().openapi({
    description:
      "The encryption password of the account. Only provide this if your local account is encrypted with a custom password.",
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
 *
 * @param transactionParamsSchema - The schema of the transaction parameters.
 * @returns A schema for an execution request.
 */
export function buildExecutionRequestSchema<T extends z.ZodSchema>(
  transactionParamsSchema: T
): // sorry for this nasty generic, but it's a necessary evil to get the type inference to work
z.ZodUnion<
  [
    z.ZodObject<
      z.objectUtil.extendShape<
        z.objectUtil.extendShape<
          (typeof specificExecutionRequestSchema)["shape"],
          { transactionParams: T }
        >,
        (typeof baseExecutionRequestSchema)["shape"]
      >
    >,
    z.ZodObject<
      z.objectUtil.extendShape<
        z.objectUtil.extendShape<
          (typeof vagueExecutionRequestSchema)["shape"],
          { transactionParams: T }
        >,
        (typeof baseExecutionRequestSchema)["shape"]
      >
    >
  ]
> {
  return z.union([
    specificExecutionRequestSchema
      .merge(
        z.object({
          transactionParams: transactionParamsSchema,
        })
      )
      .merge(baseExecutionRequestSchema),
    vagueExecutionRequestSchema
      .merge(
        z.object({
          transactionParams: transactionParamsSchema,
        })
      )
      .merge(baseExecutionRequestSchema),
  ]);
}

export const encodedExecutionRequestSchema = buildExecutionRequestSchema(
  z.array(transactionBodySchema)
);

export type EncodedExecutionRequest = z.infer<
  typeof encodedExecutionRequestSchema
>;

export const transactionResponseSchema = wrapResponseSchema(
  z.object({
    transactions: z.array(transactionDbEntrySchema),
  })
);

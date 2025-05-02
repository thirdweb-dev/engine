import * as z from "zod";
import { hexSchema, evmAddressSchema, exampleEvmAddress } from "../lib/zod.js";
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

const baseExecutionOptionsSchema = {
  idempotencyKey: z
    .string()
    .openapi({
      description:
        "The idempotency key of the transaction. Transaction requests sent with the same idempotency key will be de-duplicated. If not provided, a randomUUID will be generated. This is also used as the ID of a queued/stored transaction.",
      example: "40aebdb3-f4f6-477e-a870-cb2cb90c96a3",
    })
    .optional(),
  chainId: z.string().openapi({
    description: "The chain id of the transaction",
  }),
};

// AA Execution Options
export const aaExecutionOptionsSchema = z
  .object({
    type: z.literal("ERC4337").openapi({
      example: "ERC4337",
    }),
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

    smartAccountAddress: evmAddressSchema.optional().openapi({
      description:
        "The address of the smart account to send the transaction from. Either specify this, or the salt. If not specified, the inferred smart account will be with null salt. If both are specified, the salt will be ignored.",
    }),

    accountSalt: z.string().optional().openapi({
      description:
        "The salt of the smart account to send the transaction from. Only specify this if you want to specify a custom salt. If omitted, and smart account address is not provided, the inferred smart account will be with null salt. If a smart account address is provided, the salt will be ignored.",
    }),
  })
  .extend(baseExecutionOptionsSchema)
  .openapi({
    ref: "aaExecutionOptions",
    title: "ERC4337 Execution (Smart Account)",
  });

export const aaZksyncExecutionOptionsSchema = z
  .object({
    type: z.literal("zksync"),
    accountAddress: evmAddressSchema.openapi({
      description:
        "The EOA address of the account to send the zksync native AA transaction from.",
    }),
    sponsorGas: z.boolean().default(true),
  })
  .extend(baseExecutionOptionsSchema)
  .openapi({
    description:
      "Uses zkSync native AA for execution. This type of execution is only available on zkSync chains.",
    ref: "aaZksyncExecutionOptions",
    title: "AA:zksync Execution Options",
  });

export const autoExecutionOptionsSchema = z
  .object({
    type: z
      .literal("auto")
      .default("auto" as const)
      .openapi({
        description:
          "This is the default, a `type` does not need to be specified",
      }),
    from: evmAddressSchema.openapi({
      description:
        "The address of the account to send the transaction from. Can be the address of a smart account or an EOA.",
    }),
  })
  .extend(baseExecutionOptionsSchema)
  .openapi({
    ref: "autoExecutionOptions",
    title: "Auto-determine Best Execution Options",
    description:
      'This is the default execution option. If you do not specify an execution type, and only specify a "from" string, engine will automatically determine the most optimal options for you. If you would like to specify granular options about execution strategy choose one of the other `executionOptions` type and provide them.',
  });

export const EXECUTION_OPTIONS_EXAMPLE = {
  chainId: "84532",
  from: exampleEvmAddress,
} as const;

const executionRequestSchema = z.object({
  executionOptions: z
    .union([
      autoExecutionOptionsSchema,
      aaExecutionOptionsSchema,
      aaZksyncExecutionOptionsSchema,
    ])
    .openapi({
      description:
        "Use a specific execution type and provide options to configure engine's execution strategy. The default execution option is `auto`, (doesn't need to be specified) which will automatically determine the most optimal options for you. If you would like to specify granular options about execution strategy choose one of the other `executionOptions` type and provide them.",
      example: EXECUTION_OPTIONS_EXAMPLE,
    }),
});

/**
 * Builds a schema for an execution request.
 * Takes a schema for the shape of your transaction parameters, and returns a schema for an execution request.
 * Optionally allows extending the final schema with additional fields.
 *
 * @param paramsSchema - The schema of the transaction parameters.
 * @param extensionSchema - An optional ZodObject schema to merge into both branches of the final union schema.
 * @returns A schema for an execution request, potentially extended.
 */
export function buildExecutionRequestSchema<
  T extends z.ZodSchema,
  // biome-ignore lint/complexity/noBannedTypes: sorry, we must
  E extends z.ZodRawShape = {}, // Default to empty shape if no extension
>(
  paramsSchema: T,
  extensionSchema: z.ZodObject<E> = z.object({}) as z.ZodObject<E>,
): // // Return type reflects the union of two objects, each extended with Base, TxParams, and Extension
z.ZodObject<
  z.objectUtil.extendShape<
    // 3. Extend with Extension shape E
    z.objectUtil.extendShape<
      // 2. Extend with Base shape
      (typeof executionRequestSchema)["shape"],
      { params: T } // Add transactionParams schema T
    >,
    E // Shape from extensionSchema
  >
> {
  return executionRequestSchema
    .merge(z.object({ params: paramsSchema }))
    .merge(extensionSchema);
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

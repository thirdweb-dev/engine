import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import * as z from "zod";
import { Abi } from "abitype/zod";
import { execute } from "../../../executors/execute/execute.js";
import {
  accountActionErrorMapper,
  engineErrToHttpException,
  getDefaultErrorMessage,
  isEngineErr,
  zErrorMapper,
  type EngineErr,
} from "../../../lib/errors.js";
import { thirdwebClient } from "../../../lib/thirdweb-client.js";
import {
  credentialsFromHeaders,
  executionCredentialsHeadersSchema,
  wrapResponseSchema,
} from "../../schemas/shared-api-schemas.js";
import {
  evmAddressSchema,
  exampleBaseSepoliaUsdcAddress,
  exampleEvmAddress,
  hexSchema,
} from "../../../lib/zod.js";
import {
  encode,
  getContract,
  prepareContractCall,
  readContract,
  resolveMethod,
  type Address,
  type Hex,
} from "thirdweb";

import {
  bigIntSchema,
  buildExecutionRequestSchema,
  EXECUTION_OPTIONS_EXAMPLE,
  serialisedBigIntSchema,
  transactionResponseSchema,
} from "../../../executors/types.js";
import { getChainResult } from "../../../lib/chain.js";
import { decodeAbiParameters, parseAbiParams } from "thirdweb/utils";
import { transactionDbEntrySchema } from "../../../db/derived-schemas.js";
import { AbiFunction } from "ox";
import { ResultAsync } from "neverthrow";
import { onchainRoutesFactory } from "./factory.js";
import type { AbiParameter } from "abitype";

// Schema for contract parameters in the URL
const transactionParamsWithoutValueSchema = z.object({
  method: z.string().describe("The function to call on the contract"),
  params: z
    .array(z.any())
    .describe("The parameters to pass to the function")
    .openapi({
      example: [exampleEvmAddress, "0"],
    }),
  contractAddress: evmAddressSchema.describe("The contract address to call"),
  abi: z.array(z.any()).optional().describe("The ABI of the contract"),
});

const transactionParamsSchema = transactionParamsWithoutValueSchema.extend({
  value: bigIntSchema
    .describe("The value to send with the transaction")
    .optional()
    .default("0"),
});

const writeRequestSchema = buildExecutionRequestSchema(
  z.array(transactionParamsSchema),
).openapi({
  example: {
    params: [
      {
        contractAddress: exampleBaseSepoliaUsdcAddress,
        method:
          "function approve(address spender, uint256 value) returns (bool)",
        params: ["0x1234567890123456789012345678901234567890", "100"],
      },
    ],
    executionOptions: EXECUTION_OPTIONS_EXAMPLE,
  },
});

const encodeRequestSchema = z
  .object({
    encodeOptions: z.object({
      chainId: z.string().openapi({
        description: "The chain id of the transaction",
      }),
    }),
    params: z.array(transactionParamsSchema),
  })
  .openapi({
    example: {
      params: [
        {
          contractAddress: exampleBaseSepoliaUsdcAddress,
          method:
            "function approve(address spender, uint256 value) returns (bool)",
          params: ["0x1234567890123456789012345678901234567890", "100"],
        },
      ],
      encodeOptions: {
        chainId: "84532",
      },
    },
  });

// const readRequestSchema = buildExecutionRequestSchema(
//   z.array(transactionParamsSchema),
//   z.object({
//     multicallAddress: evmAddressSchema
//       .optional()
//       .describe("Optional multicall address"),
//   }),
// );

const MULTICALL3_DEFAULT_ADDRESS =
  "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

const readRequestSchema = z
  .object({
    readOptions: z.object({
      multicallAddress: evmAddressSchema
        .default(MULTICALL3_DEFAULT_ADDRESS)
        .describe(
          "Optional multicall address, defaults to the default multicall3 address for the chain",
        ),
      chainId: z.string().openapi({
        description: "The chain id of the transaction",
      }),
      from: evmAddressSchema.optional(),
    }),
    params: z.array(transactionParamsWithoutValueSchema),
  })
  .openapi({
    example: {
      params: [
        {
          contractAddress: exampleBaseSepoliaUsdcAddress,
          method: "function balanceOf(address account) view returns (uint256)",
          params: [exampleEvmAddress],
        },
      ],
      readOptions: {
        chainId: "84532",
      },
    },
  });

const encodeDataSchema = z.object({
  to: evmAddressSchema,
  data: hexSchema,
  value: serialisedBigIntSchema,
});

const encodeSuccessItemSchema = z.object({
  success: z.literal(true),
  result: encodeDataSchema,
});

const encodeErrorSchema = z
  .object({
    kind: z.string(),
    code: z.string(),
    status: z.number(),
    message: z.string().optional(),
    address: evmAddressSchema.optional(),
    chainId: z.string().optional(),
  })
  .describe("Standardized error object");

const encodeErrorItemSchema = z.object({
  success: z.literal(false),
  error: encodeErrorSchema,
});

const encodeResultItemSchema = z.union([
  encodeSuccessItemSchema,
  encodeErrorItemSchema,
]);

const encodeResponseSchema = wrapResponseSchema(
  z.object({ results: z.array(encodeResultItemSchema) }),
);

type EncodeSuccessItem = z.infer<typeof encodeSuccessItemSchema>;
type EncodeErrorItem = z.infer<typeof encodeErrorItemSchema>;

const readResultItemSchema = z.object({
  success: z.boolean(),
  result: z.any().nullable(),
});

const readResponseSchema = wrapResponseSchema(
  z.object({ results: z.array(readResultItemSchema) }),
);

type PreparedMulticallItem = {
  target: Address;
  allowFailure: true;
  callData: Hex;
  abiFunction: AbiFunction.AbiFunction;
};

// --- Constants ---
const MULTICALL3_AGGREGATE3_ABI = {
  /* ... ABI ... */ inputs: [
    {
      components: [
        { name: "target", type: "address" },
        { name: "allowFailure", type: "bool" },
        { name: "callData", type: "bytes" },
      ],
      name: "calls",
      type: "tuple[]",
    },
  ],
  name: "aggregate3",
  outputs: [
    {
      components: [
        { name: "success", type: "bool" },
        { name: "returnData", type: "bytes" },
      ],
      name: "returnData",
      type: "tuple[]",
    },
  ],
  stateMutability: "payable",
  type: "function",
} as const;

// --- Reusable Batch Processing Function ---

/**
 * Processes a batch of items asynchronously, handling individual errors using neverthrow.
 *
 * @param items - The array of input items to process.
 * @param client - The ThirdwebClient instance.
 * @param chain - The resolved Chain object.
 * @param processorFn - An async function that processes a single item and returns a ResultAsync.
 * @returns A Promise resolving to an array containing either success results or EngineErr objects.
 */
async function processBatch<
  TInput extends { contractAddress: Address; method: string },
  TSuccess,
  TError,
>(
  items: TInput[],
  processorFn: (item: TInput) => ResultAsync<TSuccess, TError>,
): Promise<Array<TSuccess | TError>> {
  const processingPromises = items.map((item) => processorFn(item));

  const settledResults = await Promise.all(processingPromises);

  return settledResults.map((result) => {
    return result.match<TSuccess | TError>(
      (successData) => successData,
      (errorData) => errorData,
    );
  });
}

// --- Route Handlers ---

// 1. Encode Function Data (Batch) Handler
export const encodeFunctionDataRoute = onchainRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Encode"],
    summary: "Contract Function",
    description:
      "Get transaction parameters (to, data, value) for contract calls.",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: resolver(encodeResponseSchema) },
        },
      },
    },
  }),
  validator("json", encodeRequestSchema, zErrorMapper),
  async (c) => {
    const body = c.req.valid("json");
    const { params: transactionParams, encodeOptions } = body;
    const { chainId } = encodeOptions;

    const chainResult = getChainResult(chainId);
    if (chainResult.isErr()) {
      throw engineErrToHttpException(chainResult.error);
    }
    const chain = chainResult.value;

    const overrideThirdwebClient = c.get("thirdwebClient");
    const client = overrideThirdwebClient ?? thirdwebClient;

    // Define the processor function using the user's exact logic
    const encodeProcessor = (
      transactionParam: z.infer<typeof transactionParamsSchema>, // Renamed for clarity matching snippet
    ): ResultAsync<EncodeSuccessItem, EncodeErrorItem> => {
      const { data } = Abi.safeParse(transactionParam.abi);
      const contract = getContract({
        client,
        chain,
        address: transactionParam.contractAddress,
        abi: data,
      });

      return ResultAsync.fromPromise(
        // Use the function call signature from the snippet
        resolveMethod(transactionParam.method)(contract),
        accountActionErrorMapper({
          code: "resolve_method_failed",
          // Use message from snippet if desired, or keep more specific one
          defaultMessage: `Failed to resolve method ${transactionParam.method}`,
          status: 400, // 400 might be better if method doesn't exist
          address: transactionParam.contractAddress,
          chainId: chainId,
        }),
      )
        .map((method) => {
          const params = parseAbiParams(
            method.inputs.map((i) => i.type),
            transactionParam.params,
          );
          const methodSignature = AbiFunction.format(method);

          return prepareContractCall({
            contract,
            method: methodSignature,
            params,
          });
        })
        .andThen((preparedTransaction) =>
          ResultAsync.fromPromise(
            encode(preparedTransaction),
            accountActionErrorMapper({
              code: "encode_transaction_failed",
              defaultMessage: "Failed to encode transaction",
              status: 500,
              chainId: chainId,
              address: transactionParam.contractAddress,
            }),
          ),
        )
        .map((encodedData): EncodeSuccessItem => {
          // Map the successful encoded data to the final structure
          return {
            success: true,
            result: {
              to: transactionParam.contractAddress,
              data: encodedData,
              value: (transactionParam.value ?? 0n).toString(),
            },
          };
        })
        .mapErr((engineErr) => {
          return {
            success: false,
            error: {
              ...engineErr,
              message: engineErr.message ?? getDefaultErrorMessage(engineErr),
            },
          };
        });
    };

    // Process the batch using the abstraction
    const results = await processBatch(transactionParams, encodeProcessor);

    return c.json({ result: { results } });
  },
);

// 2. Read From Contract (Batch) Handler (Remains the same, uses its own preparation logic for multicall)
export const readFromContractRoute = onchainRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Read"],
    summary: "Contract Function",
    description: "Call read-only functions using multicall.",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: resolver(readResponseSchema) },
        },
      },
    },
  }),
  validator("json", readRequestSchema, zErrorMapper),
  async (c) => {
    const body = c.req.valid("json");
    const { params: transactionParams } = body;
    const { chainId, multicallAddress: customMulticallAddress } =
      body.readOptions;

    const chainResult = getChainResult(chainId);
    if (chainResult.isErr()) {
      throw engineErrToHttpException(chainResult.error);
    }
    const chain = chainResult.value;

    const overrideThirdwebClient = c.get("thirdwebClient");
    const client = overrideThirdwebClient ?? thirdwebClient;
    const multicallAddress =
      customMulticallAddress ?? MULTICALL3_DEFAULT_ADDRESS;

    // Read route needs its own preparation logic for multicall structure
    const readPrepareProcessor = (
      callParams: z.infer<typeof transactionParamsWithoutValueSchema>,
    ): ResultAsync<PreparedMulticallItem, EngineErr> => {
      const {
        contractAddress,
        method: methodName,
        params,
        abi: customAbi,
      } = callParams;
      const { data: parsedAbi } = Abi.safeParse(customAbi);
      const contract = getContract({
        client,
        chain,
        address: contractAddress,
        abi: parsedAbi,
      });

      return ResultAsync.fromPromise(
        resolveMethod(methodName)(contract),
        accountActionErrorMapper({
          code: "resolve_method_failed",
          status: 400,
          address: contractAddress,
          chainId,
        }),
      ).andThen((abiFunction) => {
        const parsedParams = parseAbiParams(
          abiFunction.inputs.map((i) => i.type),
          params,
        );
        const preparedTx = prepareContractCall({
          contract,
          // @ts-expect-error: sdk expected type appears to be broken
          method: abiFunction,
          params: parsedParams,
        });
        return ResultAsync.fromPromise(
          encode(preparedTx),
          accountActionErrorMapper({
            code: "encode_transaction_failed",
            address: contractAddress,
            chainId,
          }),
        ).map(
          (encodedData): PreparedMulticallItem => ({
            target: contractAddress,
            allowFailure: true,
            callData: encodedData,
            abiFunction: abiFunction,
          }),
        );
      });
    };

    const preparationResults = await processBatch(
      transactionParams,
      readPrepareProcessor,
    );
    const firstError = preparationResults.find(isEngineErr);
    if (firstError) {
      throw engineErrToHttpException(firstError);
    }
    const preparedCalls = preparationResults as PreparedMulticallItem[];

    const multicallContract = getContract({
      client,
      chain,
      address: multicallAddress,
    });
    const multicallResult = await ResultAsync.fromPromise(
      readContract({
        contract: multicallContract,
        method: MULTICALL3_AGGREGATE3_ABI,
        params: [preparedCalls],
      }),
      accountActionErrorMapper({
        code: "read_contract_failed",
        status: 500,
        address: multicallAddress,
        chainId,
        defaultMessage: "Multicall execution failed",
      }),
    );
    if (multicallResult.isErr()) {
      throw engineErrToHttpException(multicallResult.error);
    }

    const rawResults = multicallResult.value;
    const decodedResults = rawResults.map((item, index) => {
      const originalPreparedCall = preparedCalls[index];
      if (!originalPreparedCall) {
        return { success: false, result: null };
      }

      const originalCallAbi = originalPreparedCall.abiFunction;
      if (!item.success) {
        return { success: false, result: null };
      }
      try {
        const outputs: readonly AbiParameter[] = originalCallAbi.outputs || [];
        const decoded = decodeAbiParameters(outputs, item.returnData);
        const finalResult = outputs.length === 1 ? decoded[0] : decoded;
        return { success: true, result: finalResult };
      } catch {
        return { success: false, result: null };
      }
    });
    return c.json({ result: { results: decodedResults } });
  },
);

export const writeToContractRoute = onchainRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Write"],
    summary: "Contract Function",
    description: "Call a write function on a contract.",
    responses: {
      200: {
        description: "Transaction sent successfully",
        content: {
          "application/json": {
            schema: resolver(
              wrapResponseSchema(z.array(transactionDbEntrySchema)),
            ),
          },
        },
      },
      202: {
        description: "Transaction queued successfully",
        content: {
          "application/json": {
            schema: resolver(transactionResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", writeRequestSchema, zErrorMapper),
  validator("header", executionCredentialsHeadersSchema, zErrorMapper),
  async (c) => {
    const body = c.req.valid("json");
    const credentials = c.req.valid("header");

    const { executionOptions, params: transactionParams } = body;
    const { chainId } = executionOptions;

    const chainResult = getChainResult(chainId);
    if (chainResult.isErr()) {
      throw engineErrToHttpException(chainResult.error);
    }
    const chain = chainResult.value;
    const overrideThirdwebClient = c.get("thirdwebClient");
    const client = overrideThirdwebClient ?? thirdwebClient;

    const transactions: {
      to: Address;
      data: Hex;
      value: bigint;
    }[] = [];

    for (const transactionParam of transactionParams) {
      const { data } = Abi.safeParse(transactionParam.abi);

      const contract = getContract({
        client,
        chain,
        address: transactionParam.contractAddress,
        abi: data,
      });

      const encodeResult = await ResultAsync.fromPromise(
        resolveMethod(transactionParam.method)(contract),
        accountActionErrorMapper({
          code: "resolve_method_failed",
          defaultMessage: `Failed to resolve method ${transactionParam.method}`,
          status: 500,
          address: transactionParam.contractAddress,
          chainId: chainId,
        }),
      )
        .map((method) => {
          const params = parseAbiParams(
            method.inputs.map((i) => i.type),
            transactionParam.params,
          );
          const methodSignature = AbiFunction.format(method);

          return prepareContractCall({
            contract,
            method: methodSignature,
            params,
          });
        })
        .andThen((preparedTransaction) =>
          ResultAsync.fromPromise(
            encode(preparedTransaction),
            accountActionErrorMapper({
              code: "encode_transaction_failed",
              defaultMessage: "Failed to encode transaction",
              status: 500,
              chainId: chainId,
              address: transactionParam.contractAddress,
            }),
          ),
        )
        .map((data) => {
          transactions.push({
            to: transactionParam.contractAddress,
            data: data,
            value: transactionParam.value ?? 0n,
          });
        });

      if (encodeResult.isErr()) {
        throw engineErrToHttpException(encodeResult.error);
      }
    }

    // Execute the transaction
    const executionResult = await execute({
      client,
      request: {
        executionOptions,
        params: transactions,
      },
      credentials: credentialsFromHeaders(credentials),
    });

    if (executionResult.isErr()) {
      throw engineErrToHttpException(executionResult.error);
    }

    return c.json({
      result: {
        transactions: executionResult.value.transactions,
      },
    });
  },
);

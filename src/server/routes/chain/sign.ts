import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import * as z from "zod";
import { ok, ResultAsync, safeTry } from "neverthrow";
import {
  accountActionErrorMapper,
  engineErrToHttpException,
  getDefaultErrorMessage,
  zErrorMapper,
  type EngineErr,
  type RpcErr,
} from "../../../lib/errors.js";
import { thirdwebClient } from "../../../lib/thirdweb-client.js";
import {
  credentialsFromHeaders,
  executionCredentialsHeadersSchema,
  wrapResponseSchema,
} from "../../schemas/shared-api-schemas.js";
import { evmAddressSchema, hexSchema } from "../../../lib/zod.js";
import {
  type Hex,
  type ThirdwebClient,
  type Chain,
  prepareTransaction,
  toSerializableTransaction,
} from "thirdweb";
import { smartWallet } from "thirdweb/wallets";

import {
  bigIntSchema,
  buildExecutionRequestSchema,
  type EncodedExecutionRequest,
} from "../../../executors/types.js";
import { getChainResult } from "../../../lib/chain.js";
import { onchainRoutesFactory } from "./factory.js";
import { TypedDataDomain, TypedDataParameter } from "abitype/zod";
import {
  getExecutionAccountFromRequest,
  type ExecutionCredentials,
} from "../../../executors/execute/execute.js";
import type { Account } from "thirdweb/wallets";

// --- Schema Definitions ---

// 1. Sign Transaction Schemas
const transactionSignatureParamsSchema = z.object({
  to: evmAddressSchema.describe("The recipient address"),
  data: hexSchema.describe("The transaction data as hex").default("0x"),
  value: bigIntSchema
    .describe("The value to send with the transaction")
    .optional(),
  nonce: z.number().int().positive().optional().describe("Transaction nonce"),
  gasLimit: bigIntSchema.optional().describe("Gas limit"),
  gasPrice: bigIntSchema
    .optional()
    .describe("Gas price (for legacy transactions)"),
  maxFeePerGas: bigIntSchema
    .optional()
    .describe("Max fee per gas (for EIP-1559)"),
  maxPriorityFeePerGas: bigIntSchema
    .optional()
    .describe("Max priority fee per gas (for EIP-1559)"),
  accessList: z
    .array(
      z.object({
        address: evmAddressSchema,
        storageKeys: z.array(hexSchema),
      }),
    )
    .optional()
    .describe("Access list for EIP-2930 and later transactions"),
  // type: z
  //   .enum(["0x00", "0x01", "0x02", "0x03", "0x05"])
  //   .optional()
  //   .describe(
  //     "Transaction type (legacy, EIP-2930, EIP-1559, EIP-4844, EIP-7702)",
  //   ),
  // EIP-4844 specific fields
  maxFeePerBlobGas: bigIntSchema
    .optional()
    .describe("Max fee per blob gas (for EIP-4844)"),
  blobVersionedHashes: z
    .array(hexSchema)
    .optional()
    .describe("Blob versioned hashes (for EIP-4844)"),
  // EIP-7702 specific fields
  authorizationList: z
    .array(
      z.object({
        address: evmAddressSchema.describe("Authorization address"),
        r: bigIntSchema.describe("r value of the signature"),
        s: bigIntSchema.describe("s value of the signature"),
        v: z
          .union([z.number(), z.string()])
          .optional()
          .describe("v value of the signature"),
        yParity: z.number().describe("yParity value (0 or 1)"),
        nonce: bigIntSchema.describe("Authorization nonce"),
        chainId: z.number().int().positive().describe("Authorization chainId"),
      }),
    )
    .optional()
    .describe("Authorization list (for EIP-7702)"),
});

const signTransactionRequestSchema = buildExecutionRequestSchema(
  z.array(transactionSignatureParamsSchema),
);

const signatureDataSchema = z.object({
  signature: hexSchema.describe("The resulting signature"),
  signedData: hexSchema.optional().describe("Optional signed data"),
});

const signSuccessItemSchema = z.object({
  success: z.literal(true),
  result: signatureDataSchema,
});

const signErrorSchema = z
  .object({
    kind: z.string(),
    code: z.string(),
    status: z.number(),
    message: z.string().optional(),
    address: evmAddressSchema.optional(),
    chainId: z.string().optional(),
  })
  .describe("Standardized error object");

const signErrorItemSchema = z.object({
  success: z.literal(false),
  error: signErrorSchema,
});

const signResultItemSchema = z.union([
  signSuccessItemSchema,
  signErrorItemSchema,
]);

const signResponseSchema = wrapResponseSchema(
  z.object({ results: z.array(signResultItemSchema) }),
);

type SignSuccessItem = z.infer<typeof signSuccessItemSchema>;
type SignErrorItem = z.infer<typeof signErrorItemSchema>;

// 2. Sign Message Schemas
const messageSignatureParamsSchema = z.object({
  message: z.string().describe("The message to sign"),
  messageFormat: z
    .enum(["text", "hex"])
    .default("text")
    .describe("Format of the message (text or hex)"),
});

const signMessageRequestSchema = buildExecutionRequestSchema(
  z.array(messageSignatureParamsSchema),
);

// 3. Sign Typed Data Schemas
const typedDataSignatureParamsSchema = z
  .object({
    domain: TypedDataDomain,
    types: z.record(z.string(), z.array(TypedDataParameter)),
    primaryType: z.string(),
    message: z.record(z.string(), z.any()),
  })
  .describe("The EIP-712 typed data structure");

const signTypedDataRequestSchema = buildExecutionRequestSchema(
  z.array(typedDataSignatureParamsSchema),
);

/**
 * Processes a batch of items asynchronously, handling individual errors using neverthrow.
 *
 * @param items - The array of input items to process.
 * @param processorFn - An async function that processes a single item and returns a ResultAsync.
 * @returns A Promise resolving to an array containing either success results or error objects.
 */
async function processBatch<TInput, TSuccess, TError>(
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

// Helper to get the correct signing account based on the request
function getSigningAccount({
  request,
  credentials,
  client,
  chain,
}: {
  request: EncodedExecutionRequest;
  credentials: ExecutionCredentials;
  client: ThirdwebClient;
  chain: Chain;
}): ResultAsync<Account, EngineErr> {
  return safeTry(async function* () {
    const accountResult = yield* getExecutionAccountFromRequest({
      request,
      credentials,
      client,
    });

    switch (accountResult.type) {
      case "EOA": {
        return ok(accountResult.account);
      }
      case "AA:zksync": {
        return ok(accountResult.zkEoaAccount);
      }
      case "AA": {
        const { signerAccount, smartAccountDetails } = accountResult;

        // Handle the async import and connection with ResultAsync.fromPromise
        // Configure the smart wallet with the details from the request
        const wallet = smartWallet({
          chain,
          factoryAddress: smartAccountDetails.factoryAddress,
          overrides: {
            entrypointAddress: smartAccountDetails.entrypointAddress,
            accountAddress: smartAccountDetails.address,
            accountSalt: smartAccountDetails.accountSalt ?? undefined,
          },
          sponsorGas:
            "sponsorGas" in request.executionOptions
              ? request.executionOptions.sponsorGas
              : true,
        });

        // Connect the smart wallet using the signer account
        const smartAccountResult = ResultAsync.fromPromise(
          wallet.connect({
            client,
            personalAccount: signerAccount,
          }),
          accountActionErrorMapper({
            code: "smart_account_determination_failed",
            defaultMessage: `Failed to connect smart account`,
            status: 500,
            address: smartAccountDetails.address,
            chainId: request.executionOptions.chainId,
          }),
        );
        return ok(yield* smartAccountResult);
      }
    }
  });
}

// --- Route Handlers ---

// 1. Sign Transaction (Batch) Handler
export const signTransactionRoute = onchainRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Sign"],
    summary: "Sign Transaction",
    description: "Sign transactions without sending them.",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: resolver(signResponseSchema) },
        },
      },
    },
  }),
  validator("json", signTransactionRequestSchema, zErrorMapper),
  validator("header", executionCredentialsHeadersSchema, zErrorMapper),
  async (c) => {
    const body = c.req.valid("json");
    const credentials = c.req.valid("header");
    const { params: transactionParams, executionOptions } = body;
    const { chainId } = executionOptions;

    const overrideThirdwebClient = c.get("thirdwebClient");
    const chainResult = getChainResult(chainId);
    if (chainResult.isErr()) {
      throw engineErrToHttpException(chainResult.error);
    }
    const chain = chainResult.value;
    const effectiveThirdwebClient = overrideThirdwebClient ?? thirdwebClient;

    // Get the account for signing
    const accountResult = await getSigningAccount({
      request: body as EncodedExecutionRequest,
      client: effectiveThirdwebClient,
      chain,
      credentials: credentialsFromHeaders(credentials),
    });

    if (accountResult.isErr()) {
      throw engineErrToHttpException(accountResult.error);
    }
    const signingAccount = accountResult.value;

    if (!signingAccount.signTransaction) {
      throw engineErrToHttpException({
        code: "sign_transaction_failed",
        kind: "rpc",
        message:
          "Underlying signing account does not support transaction signing",
        status: 500,
        chainId: chainId,
      } as RpcErr);
    }

    const signTransactionMethod =
      signingAccount.signTransaction.bind(signingAccount);

    const signProcessor = (
      transactionParam: z.infer<typeof transactionSignatureParamsSchema>,
    ): ResultAsync<SignSuccessItem, SignErrorItem> => {
      return safeTry(async function* () {
        const preparedTransaction = prepareTransaction({
          chain,
          client: effectiveThirdwebClient,
          ...transactionParam,
        });

        const serializableTransaction = yield* ResultAsync.fromPromise(
          toSerializableTransaction({
            transaction: preparedTransaction,
            from: signingAccount.address,
          }),
          accountActionErrorMapper({
            code: "serialize_transaction_failed",
            defaultMessage: "Failed to serialize transaction",
            status: 400,
            chainId: chainId,
          }),
        );

        const signature = yield* ResultAsync.fromPromise(
          signTransactionMethod(serializableTransaction),
          accountActionErrorMapper({
            code: "sign_transaction_failed",
            defaultMessage: "Failed to sign transaction",
            status: 500,
            chainId: chainId,
          }),
        );

        return ok({
          success: true,
          result: {
            signature,
          },
        } as SignSuccessItem);
      }).mapErr((engineErr) => {
        return {
          success: false,
          error: {
            ...engineErr,
            message: engineErr.message ?? getDefaultErrorMessage(engineErr),
          },
        } as SignErrorItem;
      });
    };

    // Process the batch using the abstraction
    const results = await processBatch(transactionParams, signProcessor);

    return c.json({ result: { results } });
  },
);

// 2. Sign Message (Batch) Handler
export const signMessageRoute = onchainRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Sign"],
    summary: "Sign Message",
    description: "Sign arbitrary messages.",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: resolver(signResponseSchema) },
        },
      },
    },
  }),
  validator("json", signMessageRequestSchema, zErrorMapper),
  validator("header", executionCredentialsHeadersSchema, zErrorMapper),
  async (c) => {
    const body = c.req.valid("json");
    const credentials = c.req.valid("header");

    const { params: transactionParams, executionOptions } = body;
    const { chainId } = executionOptions;

    const chainResult = getChainResult(chainId);
    if (chainResult.isErr()) {
      throw engineErrToHttpException(chainResult.error);
    }
    const chain = chainResult.value;

    const overrideThirdwebClient = c.get("thirdwebClient");
    const effectiveThirdwebClient = overrideThirdwebClient ?? thirdwebClient;

    // Get the account for signing
    const accountResult = await getSigningAccount({
      request: body as EncodedExecutionRequest,
      client: effectiveThirdwebClient,
      credentials: credentialsFromHeaders(credentials),
      chain,
    });
    if (accountResult.isErr()) {
      throw engineErrToHttpException(accountResult.error);
    }
    const signingAccount = accountResult.value;

    if (!signingAccount.signMessage) {
      throw engineErrToHttpException({
        code: "sign_message_failed",
        kind: "rpc",
        message: "Underlying signing account does not support messaage signing",
        status: 500,
        chainId: chainId,
      } as RpcErr);
    }
    const signMessageMethod = signingAccount.signMessage.bind(signingAccount);

    const signMessageProcessor = (
      messageParam: z.infer<typeof messageSignatureParamsSchema>,
    ): ResultAsync<SignSuccessItem, SignErrorItem> => {
      return safeTry(async function* () {
        const { message, messageFormat } = messageParam;

        // Convert to the appropriate SignableMessage type based on format
        const signableMessage =
          messageFormat === "hex" ? { raw: message as Hex } : message;

        const signature = yield* ResultAsync.fromPromise(
          signMessageMethod({ message: signableMessage, chainId: chain.id }),
          accountActionErrorMapper({
            code: "sign_message_failed",
            defaultMessage: "Failed to sign message",
            status: 500,
            chainId: chainId,
          }),
        );

        return ok({
          success: true,
          result: {
            signature,
            signedData: typeof message === "string" ? message : undefined,
          },
        } as SignSuccessItem);
      }).mapErr((engineErr) => {
        return {
          success: false,
          error: {
            ...engineErr,
            message: engineErr.message ?? getDefaultErrorMessage(engineErr),
          },
        } as SignErrorItem;
      });
    };

    // Process the batch using the abstraction
    const results = await processBatch(transactionParams, signMessageProcessor);

    return c.json({ result: { results } });
  },
);

// 3. Sign Typed Data (Batch) Handler
export const signTypedDataRoute = onchainRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Sign"],
    summary: "Sign Typed Data",
    description: "Sign EIP-712 typed data.",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": { schema: resolver(signResponseSchema) },
        },
      },
    },
  }),
  validator("json", signTypedDataRequestSchema, zErrorMapper),
  validator("header", executionCredentialsHeadersSchema, zErrorMapper),
  async (c) => {
    const body = c.req.valid("json");
    const credentials = c.req.valid("header");

    const { params: transactionParams, executionOptions } = body;
    const { chainId } = executionOptions;

    const chainResult = getChainResult(chainId);
    if (chainResult.isErr()) {
      throw engineErrToHttpException(chainResult.error);
    }
    const chain = chainResult.value;

    const overrideThirdwebClient = c.get("thirdwebClient");
    const effectiveThirdwebClient = overrideThirdwebClient ?? thirdwebClient;

    // Get the account for signing
    const accountResult = await getSigningAccount({
      request: body as EncodedExecutionRequest,
      client: effectiveThirdwebClient,
      credentials: credentialsFromHeaders(credentials),
      chain,
    });
    if (accountResult.isErr()) {
      throw engineErrToHttpException(accountResult.error);
    }
    const signingAccount = accountResult.value;

    if (!signingAccount.signTypedData) {
      throw engineErrToHttpException({
        code: "sign_typed_data_failed",
        kind: "rpc",
        message: "Underlying signing account does not support EIP712 signing",
        status: 500,
        chainId: chainId,
      } as RpcErr);
    }

    const signTypedDataMethod =
      signingAccount.signTypedData.bind(signingAccount);

    const signTypedDataProcessor = (
      typedData: z.infer<typeof typedDataSignatureParamsSchema>,
    ): ResultAsync<SignSuccessItem, SignErrorItem> => {
      return safeTry(async function* () {
        const { domain, types, primaryType, message } = typedData;

        const signature = yield* ResultAsync.fromPromise(
          signTypedDataMethod({
            // @ts-expect-error - SDK type does not match abitype zod schema
            domain,
            types,
            primaryType,
            message,
          }),
          accountActionErrorMapper({
            code: "sign_typed_data_failed",
            defaultMessage: "Failed to sign typed data",
            status: 500,
            chainId: chainId,
          }),
        );

        return ok({
          success: true,
          result: {
            signature,
          },
        } as SignSuccessItem);
      }).mapErr((engineErr) => {
        return {
          success: false,
          error: {
            ...engineErr,
            message: engineErr.message ?? getDefaultErrorMessage(engineErr),
          },
        } as SignErrorItem;
      });
    };

    // Process the batch using the abstraction
    const results = await processBatch(
      transactionParams,
      signTypedDataProcessor,
    );

    return c.json({ result: { results } });
  },
);

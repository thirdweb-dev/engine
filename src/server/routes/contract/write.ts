import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import * as z from "zod";
import { Abi } from "abitype/zod";
import { execute } from "../../../executors/execute/execute";
import {
  accountActionErrorMapper,
  engineErrToHttpException,
  zErrorMapper,
} from "../../../lib/errors";
import { thirdwebClient } from "../../../lib/thirdweb-client";
import { wrapResponseSchema } from "../../schemas/shared-api-schemas";
import { contractRoutesFactory } from "./factory";
import { evmAddressSchema } from "../../../lib/zod";
import {
  getContract,
  prepareContractCall,
  resolveMethod,
  toSerializableTransaction,
  type Address,
  type Hex,
} from "thirdweb";
import {
  buildExecutionRequestSchema,
  transactionResponseSchema,
} from "../../../executors/types";
import { getChain } from "../../../lib/chain";
import { parseAbiParams } from "thirdweb/utils";
import { transactionDbEntrySchema } from "../../../db/derived-schemas";
import { AbiFunction } from "ox";
import { ResultAsync } from "neverthrow";

// Schema for contract parameters in the URL
const transactionParamsSchema = z.object({
  value: z
    .bigint()
    .optional()
    .describe("The value to send with the transaction"),
  method: z.string().describe("The function to call on the contract"),
  params: z.array(z.any()).describe("The parameters to pass to the function"),
  contractAddress: evmAddressSchema.describe("The contract address to call"),
  abi: z.array(z.any()).optional().describe("The ABI of the contract"),
});

const requestSchema = buildExecutionRequestSchema(
  z.array(transactionParamsSchema)
);

export const writeToContractRoute = contractRoutesFactory.createHandlers(
  describeRoute({
    tags: ["Contract"],
    summary: "Write to contract",
    description: "Call a write function on a contract.",
    responses: {
      200: {
        description: "Transaction sent successfully",
        content: {
          "application/json": {
            schema: resolver(
              wrapResponseSchema(z.array(transactionDbEntrySchema))
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
  validator("json", requestSchema, zErrorMapper),
  async (c) => {
    const body = c.req.valid("json");

    const { chainId, transactionParams } = body;

    const chain = await getChain(Number.parseInt(chainId));
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
        })
      )
        .map((method) => {
          const params = parseAbiParams(
            method.inputs.map((i) => i.type),
            transactionParam.params
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
            toSerializableTransaction({
              transaction: preparedTransaction,
              from: transactionParam.contractAddress,
            }),
            accountActionErrorMapper({
              code: "serialize_transaction_failed",
              defaultMessage: "Failed to serialize transaction",
              status: 500,
              chainId: chainId,
              address: transactionParam.contractAddress,
            })
          )
        )
        .map((serializeableTransaction) => {
          transactions.push({
            to: transactionParam.contractAddress,
            data: serializeableTransaction.data,
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
        ...body,
        transactionParams: transactions,
      },
    });

    if (executionResult.isErr()) {
      throw engineErrToHttpException(executionResult.error);
    }

    return c.json({
      result: {
        transactions: executionResult.value.transactions,
      },
    });
  }
);

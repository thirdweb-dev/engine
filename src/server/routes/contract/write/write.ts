import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prepareContractCall, resolveMethod } from "thirdweb";
import type { AbiFunction } from "thirdweb/utils";
import { getContractV5 } from "../../../../utils/cache/getContractv5";
import { prettifyError } from "../../../../utils/error";
import { queueTransaction } from "../../../../utils/transaction/queueTransation";
import { createCustomError } from "../../../middleware/error";
import { abiArraySchema } from "../../../schemas/contract";
import {
  contractParamSchema,
  requestQuerystringSchema,
  transactionWritesResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../schemas/txOverrides";
import {
  maybeAddress,
  requiredAddress,
  walletWithAAHeaderSchema,
} from "../../../schemas/wallet";
import { sanitizeAbi } from "../../../utils/abi";
import { getChainIdFromChain } from "../../../utils/chain";
import { parseTransactionOverrides } from "../../../utils/transactionOverrides";

// INPUT
const writeRequestBodySchema = Type.Object({
  functionName: Type.String({
    description: "The function to call on the contract",
  }),
  args: Type.Array(Type.Any(), {
    description: "The arguments to call on the function",
  }),
  ...txOverridesWithValueSchema.properties,
  abi: Type.Optional(abiArraySchema),
});

// LOGIC
export async function writeToContract(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof writeRequestBodySchema>;
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/write",
    schema: {
      summary: "Write to contract",
      description: "Call a write function on a contract.",
      tags: ["Contract"],
      operationId: "write",
      params: contractParamSchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      body: writeRequestBodySchema,
      response: {
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { functionName, args, txOverrides, abi } = request.body;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-factory-address": accountFactoryAddress,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
        abi: sanitizeAbi(abi),
      });

      // 3 possible ways to get function from abi:
      // 1. functionName passed as solidity signature
      // 2. functionName passed as function name + passed in ABI
      // 3. functionName passed as function name + inferred ABI (fetched at encode time)
      // this is all handled inside the `resolveMethod` function
      let method: AbiFunction;
      try {
        method = await resolveMethod(functionName)(contract);
      } catch (e) {
        throw createCustomError(
          prettifyError(e),
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }
      const transaction = prepareContractCall({
        contract,
        method,
        params: args,
        ...parseTransactionOverrides(txOverrides),
      });

      const queueId = await queueTransaction({
        transaction,
        fromAddress: requiredAddress(fromAddress, "x-backend-wallet-address"),
        toAddress: maybeAddress(contractAddress, "to"),
        accountAddress: maybeAddress(accountAddress, "x-account-address"),
        accountFactoryAddress: maybeAddress(
          accountFactoryAddress,
          "x-account-factory-address",
        ),
        txOverrides,
        idempotencyKey,
        shouldSimulate: simulateTx,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

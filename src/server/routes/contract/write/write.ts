import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prepareContractCall, resolveMethod } from "thirdweb";
import { getContractV5 } from "../../../../utils/cache/getContractv5";
import { maybeBigInt } from "../../../../utils/primitiveTypes";
import { queueTransaction } from "../../../../utils/transaction/queueTransation";
import { createCustomError } from "../../../middleware/error";
import { abiSchema } from "../../../schemas/contract";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../schemas/txOverrides";
import {
  maybeAddress,
  requiredAddress,
  walletWithAAHeaderSchema,
} from "../../../schemas/wallet";
import { getChainIdFromChain } from "../../../utils/chain";

// INPUT
const writeRequestBodySchema = Type.Object({
  functionName: Type.String({
    description: "The function to call on the contract",
  }),
  args: Type.Array(Type.Any(), {
    description: "The arguments to call on the function",
  }),
  ...txOverridesWithValueSchema.properties,
  abi: Type.Optional(Type.Array(Type.Object({
    type: Type.String(),
    name: Type.Optional(Type.String()),
    inputs: Type.Optional(Type.Array(Type.Object({
      type: Type.Optional(Type.String()),
      name: Type.Optional(Type.String()),
      stateMutability: Type.Optional(Type.String()),
      components: Type.Optional(Type.Array(Type.Object({
        type: Type.Optional(Type.String()),
        name: Type.Optional(Type.String()),
        internalType: Type.Optional(Type.String()),
      }))),
    }))),
    outputs: Type.Optional(Type.Array(Type.Object({
      type: Type.Optional(Type.String()),
      name: Type.Optional(Type.String()),
      stateMutability: Type.Optional(Type.String()),
      components: Type.Optional(Type.Array(Type.Object({
        type: Type.Optional(Type.String()),
        name: Type.Optional(Type.String()),
        internalType: Type.Optional(Type.String()),
      }))),
    }))),
    stateMutability: Type.Optional(Type.String()),
  }))),
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
        abi,
      });

      // 3 possible ways to get function from abi:
      // 1. functionName passed as solidity signature
      // 2. functionName passed as function name + passed in ABI
      // 3. functionName passed as function name + inferred ABI (fetched at encode time)
      // this is all handled inside the `resolveMethod` function
      let method;
      try {
        method = await resolveMethod(functionName)(contract);
      } catch (e: any) {
        throw createCustomError(`${e}`, StatusCodes.BAD_REQUEST, "BAD_REQUEST");
      }
      const transaction = prepareContractCall({
        contract,
        method,
        params: args,
        gas: maybeBigInt(txOverrides?.gas),
        value: maybeBigInt(txOverrides?.value),
        maxFeePerGas: maybeBigInt(txOverrides?.maxFeePerGas),
        maxPriorityFeePerGas: maybeBigInt(txOverrides?.maxPriorityFeePerGas),
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

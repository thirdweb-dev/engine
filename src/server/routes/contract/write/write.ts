import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../db/transactions/queueTx";
import { getContract } from "../../../../utils/cache/getContract";
import { abiSchema } from "../../../schemas/contract";
import {
  contractParamSchema,
  requestQuerystringSchema,
  transactionWritesResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../schemas/txOverrides";
import {
  maybeAddress,
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
  abi: Type.Optional(Type.Array(abiSchema)),
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
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-factory-address": accountFactoryAddress,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
        abi,
      });

      const tx = contract.prepare(functionName, args, {
        value: txOverrides?.value,
        gasLimit: txOverrides?.gas,
        maxFeePerGas: txOverrides?.maxFeePerGas,
        maxPriorityFeePerGas: txOverrides?.maxPriorityFeePerGas,
      });

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "none",
        idempotencyKey,
        txOverrides,
        accountFactoryAddress: maybeAddress(
          accountFactoryAddress,
          "x-account-factory-address",
        ),
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

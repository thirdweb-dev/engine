import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../db/transactions/queueTx";
import { getContract } from "../../../../utils/cache/getContract";
import { abiSchema } from "../../../schemas/contract";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../schemas/wallet";
import { getChainIdFromChain } from "../../../utils/chain";

// INPUT
const writeRequestBodySchema = Type.Object({
  functionName: Type.String({
    description: "The function to call on the contract",
  }),
  args: Type.Array(
    Type.Union([
      Type.String({
        description: "The arguments to call on the function",
      }),
      Type.Tuple([Type.String(), Type.String()]),
      Type.Object({}),
      Type.Array(Type.Any()),
      Type.Any(),
    ]),
  ),
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
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
      body: writeRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { functionName, args, txOverrides, abi } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
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
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

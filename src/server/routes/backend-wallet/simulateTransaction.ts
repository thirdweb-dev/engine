import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../utils/cache/getContract";
import {
  simulateResponseSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { walletWithAAHeaderSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import { SimulateTxParams, simulateTx } from "../../utils/simulateTx";

// INPUT
const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const simulateRequestBodySchema = Type.Object({
  toAddress: Type.String({
    description: "The contract address",
  }),
  value: Type.Optional(
    Type.String({
      examples: ["0"],
      description: "The amount of native currency",
    }),
  ),
  // Decoded transaction args
  functionName: Type.Optional(
    Type.String({
      description: "The function to call on the contract",
    }),
  ),
  args: Type.Optional(
    Type.Array(
      Type.Union([
        Type.String({
          description: "The arguments to call for this function",
        }),
        Type.Tuple([Type.String(), Type.String()]),
        Type.Object({}),
        Type.Array(Type.Any()),
        Type.Any(),
      ]),
    ),
  ),
  // Raw transaction args
  data: Type.Optional(
    Type.String({
      description: "Raw calldata",
    }),
  ),
});

// LOGIC
export async function simulateTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof simulateRequestBodySchema>;
    Reply: Static<typeof simulateResponseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/simulate-transaction",
    schema: {
      summary: "Simulate a transaction",
      description: "Simulate a transaction with transaction parameters",
      tags: ["Backend Wallet"],
      operationId: "simulateTransaction",
      params: ParamsSchema,
      body: simulateRequestBodySchema,
      headers: walletWithAAHeaderSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: simulateResponseSchema,
      },
    },
    handler: async (request, reply) => {
      // Destruct core params
      const { chain } = request.params;
      const { toAddress, value, functionName, args, data } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);

      // Get decoded tx simulate args
      let simulateArgs: SimulateTxParams;
      if (functionName && args) {
        const contract = await getContract({
          chainId,
          contractAddress: toAddress,
          walletAddress,
          accountAddress,
        });
        const tx = contract.prepare(functionName, args, {
          value: value ?? "0",
        });
        simulateArgs = { tx };
      }
      // Get raw tx simulate args
      else {
        simulateArgs = {
          txRaw: {
            chainId: chainId.toString(),
            fromAddress: walletAddress,
            toAddress,
            data,
            value,
          },
        };
      }

      // Simulate raw tx
      await simulateTx(simulateArgs);

      // Return success
      reply.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { InputTransaction } from "../../../schema/transaction";
import { getContract } from "../../../utils/cache/getContract";
import { createCustomError } from "../../middleware/error";
import {
  simulateResponseSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { walletHeaderSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import { simulate } from "../../utils/simulateTx";

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
      headers: walletHeaderSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: simulateResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { toAddress, value, functionName, args, data } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
      } = request.headers as Static<typeof walletHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);

      if (functionName && args) {
        // Simulate a function call to a contract.
        const contract = await getContract({
          chainId,
          contractAddress: toAddress,
          walletAddress,
          accountAddress,
        });
        const tx = contract.prepare(functionName, args, { value });
        await simulate({ tx });
      } else if (data) {
        // Simulate from raw calldata.
        const txRaw: InputTransaction = {
          chainId,
          fromAddress: walletAddress,
          toAddress,
          data,
          value: value ? BigInt(value) : 0n,
        };
        await simulate({ txRaw });
      } else {
        throw createCustomError(
          "Missing params for simulation",
          StatusCodes.BAD_REQUEST,
          "INVALID_SIMULATION_PARAMS",
        );
      }

      // Return success
      reply.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}

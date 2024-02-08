import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../utils/cache/getContract";
import {
  simulateResponseSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import { SimulateTxParams, simulateTx } from "../../utils/simulateTx";

// INPUT
const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const simulateRequestBodySchema = Type.Object({
  toAddress: Type.String({
    description: "Address of the contract",
  }),
  value: Type.Optional(
    Type.String({
      examples: ["0"],
      description: "Native Currency Value",
    }),
  ),
  // Decoded transaction args
  functionName: Type.Optional(
    Type.String({
      description: "Name of the function to call on Contract",
    }),
  ),
  args: Type.Optional(
    Type.Array(
      Type.Union([
        Type.String({
          description: "Arguments for the function. Comma Separated",
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
      description: "Transaction Data",
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
      headers: Type.Omit(walletAuthSchema, ["x-account-address"]),
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: simulateResponseSchema,
      },
    },
    handler: async (request, reply) => {
      // Destruct core params
      const { chain } = request.params;
      const { toAddress, value, functionName, args, data } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
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

import { Static, Type } from "@sinclair/typebox";
import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Address, Hex } from "thirdweb";
import { simulateQueuedTransaction } from "../../../utils/transaction/simulateTransaction";
import { QueuedTransaction } from "../../../utils/transaction/types";
import { createCustomError } from "../../middleware/error";
import {
  simulateResponseSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { walletWithAAHeaderSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

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
      const { chain } = request.params;
      const { toAddress, value, functionName, args, data } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);

      // @TODO: handle userops

      const queuedTransaction: QueuedTransaction = {
        status: "queued",
        queueId: randomUUID(),
        queuedAt: new Date(),

        chainId,
        from: walletAddress as Address,
        to: toAddress as Address,
        functionName,
        functionArgs: args,
        data: data as Hex | undefined,
        value: value ? BigInt(value) : 0n,
      };

      const error = await simulateQueuedTransaction(queuedTransaction);
      if (error) {
        throw createCustomError(
          error,
          StatusCodes.BAD_REQUEST,
          "FAILED_SIMULATION",
        );
      }

      reply.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";
import type { Address, Hex } from "thirdweb";
import { doSimulateTransaction } from "../../../shared/utils/transaction/simulate-queued-transaction";
import type { QueuedTransaction } from "../../../shared/utils/transaction/types";
import { createCustomError } from "../../middleware/error";
import { AddressSchema } from "../../schemas/address";
import {
  simulateResponseSchema,
  standardResponseSchema,
} from "../../schemas/shared-api-schemas";
import {
  walletChainParamSchema,
  walletWithAAHeaderSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const FunctionArgumentSchema = Type.Union([
  Type.String({ description: "String argument" }),
  Type.Number({ description: "Numeric argument" }),
  Type.Boolean({ description: "Boolean argument" }),
  Type.Array(Type.Any(), { description: "Array argument" }),
  Type.Object({}, { description: "Object argument" }),
]);

const simulateRequestBodySchema = Type.Object({
  toAddress: {
    ...AddressSchema,
    description: "The contract address",
  },
  value: Type.Optional(
    Type.String({
      examples: ["0"],
      description: "The amount of native currency in wei",
    }),
  ),
  // Decoded transaction args
  functionName: Type.Optional(
    Type.String({
      description: "The function to call on the contract",
    }),
  ),
  args: Type.Optional(
    Type.Array(FunctionArgumentSchema, {
      description: "The arguments to call for this function",
    }),
  ),
  // Raw transaction args
  data: Type.Optional(
    Type.String({
      description: "Raw calldata",
    }),
  ),
});

export async function simulateTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof walletChainParamSchema>;
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
      params: walletChainParamSchema,
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

      let queuedTransaction: QueuedTransaction = {
        status: "queued",
        queueId: randomUUID(),
        queuedAt: new Date(),
        resendCount: 0,

        chainId,
        from: walletAddress as Address,
        to: toAddress as Address,
        functionName,
        functionArgs: args,
        data: data as Hex | undefined,
        value: value ? BigInt(value) : 0n,

        ...(accountAddress
          ? {
              isUserOp: true,
              accountAddress: accountAddress as Address,
              target: toAddress as Address,
              signerAddress: walletAddress as Address,
            }
          : {
              isUserOp: false,
            }),
      };

      const simulateError = await doSimulateTransaction(queuedTransaction);
      if (simulateError) {
        throw createCustomError(
          simulateError,
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

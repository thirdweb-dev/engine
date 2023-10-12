import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../src/db/client";
import {
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { walletAuthSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utilities/chain";

const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const requestBodySchema = Type.Object({
  toAddress: Type.Optional(
    Type.String({
      examples: ["0x..."],
    }),
  ),
  data: Type.String({
    examples: ["0x..."],
  }),
  value: Type.String({
    examples: ["10000000"],
  }),
});

requestBodySchema.examples = [
  {
    toAddress: "0x7a0ce8524bea337f0bee853b68fabde145dac0a0",
    data: "0x449a52f800000000000000000000000043cae0d7fe86c713530e679ce02574743b2ee9fc0000000000000000000000000000000000000000000000000de0b6b3a7640000",
    value: "0x00",
  },
];

export async function sendTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
  }>({
    method: "POST",
    url: "/wallet/:chain/send-transaction",
    schema: {
      summary: "Send a raw transaction",
      description: "Send a raw transaction with transaction parameters",
      tags: ["Backend Wallet"],
      operationId: "walletSendTransaction",
      params: ParamsSchema,
      body: requestBodySchema,
      headers: Type.Omit(walletAuthSchema, ["x-account-address"]),
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { toAddress, data, value } = request.body;
      const fromAddress = request.headers["x-backend-wallet-address"] as string;
      const chainId = getChainIdFromChain(chain);

      // TODO: At some point we should simulate this first
      // For now, it's okay not to since its a raw transaction
      const { id: queueId } = await prisma.transactions.create({
        data: {
          chainId,
          fromAddress,
          toAddress,
          data,
          value,
        },
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

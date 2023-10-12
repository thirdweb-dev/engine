import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../src/db/client";
import {
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../utilities/chain";

const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const requestBodySchema = Type.Object({
  fromAddress: Type.String({
    examples: ["0x..."],
  }),
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
    fromAddress: "0x43CAe0d7fe86C713530E679Ce02574743b2Ee9FC",
    toAddress: "0x7a0ce8524bea337f0bee853b68fabde145dac0a0",
    data: "0x449a52f800000000000000000000000043cae0d7fe86c713530e679ce02574743b2ee9fc0000000000000000000000000000000000000000000000000de0b6b3a7640000",
    value: "0x00",
  },
];

export async function sendRawTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
  }>({
    method: "POST",
    url: "/transaction/:chain/send-raw",
    schema: {
      summary: "Send a raw transaction",
      description: "Send a raw transaction with transaction parameters",
      tags: ["Transaction"],
      operationId: "txSendRaw",
      params: ParamsSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { fromAddress, toAddress, data, value } = request.body;
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

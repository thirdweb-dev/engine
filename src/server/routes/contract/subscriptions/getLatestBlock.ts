import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getLastIndexedBlock } from "../../../../shared/db/chainIndexers/get-chain-indexer";
import { chainRequestQuerystringSchema } from "../../../schemas/chain";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const responseSchema = Type.Object({
  result: Type.Object({
    lastBlock: Type.Integer(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    lastBlock: 100,
    status: "success",
  },
};

export async function getLatestBlock(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof chainRequestQuerystringSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract-subscriptions/last-block",
    schema: {
      summary: "Get last processed block",
      description: "Get the last processed block for a chain.",
      tags: ["Contract-Subscriptions"],
      operationId: "getLatestBlock",
      querystring: chainRequestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.query;
      const chainId = await getChainIdFromChain(chain);

      const lastBlock = await getLastIndexedBlock({ chainId });

      reply.status(StatusCodes.OK).send({
        result: {
          lastBlock: lastBlock ?? 0,
          status: "success",
        },
      });
    },
  });
}

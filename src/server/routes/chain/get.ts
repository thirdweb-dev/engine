import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getChainMetadata } from "thirdweb/chains";
import { getChain } from "../../../utils/chain";
import {
  chainRequestQuerystringSchema,
  chainResponseSchema,
} from "../../schemas/chain";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../utils/chain";

// OUTPUT
const responseSchema = Type.Object({
  result: chainResponseSchema,
});

responseSchema.examples = [
  {
    result: {
      name: "Polygon Amoy Testnet",
      chain: "Polygon",
      rpc: ["https://80002.rpc.thirdweb.com/${THIRDWEB_API_SECRET_KEY}"],
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
      },
      shortName: "amoy",
      chainId: 80002,
      testnet: true,
      slug: "polygon-amoy-testnet",
    },
  },
];

// LOGIC
export async function getChainData(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof chainRequestQuerystringSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/chain/get",
    schema: {
      summary: "Get chain details",
      description: "Get details about a chain.",
      tags: ["Chain"],
      operationId: "getChain",
      querystring: chainRequestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const chainV5 = await getChain(chainId);
      const chainMetadata = await getChainMetadata(chainV5);

      reply.status(StatusCodes.OK).send({
        result: {
          ...chainMetadata,
          rpc: [...chainMetadata.rpc],
        },
      });
    },
  });
}

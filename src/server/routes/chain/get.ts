import { Static, Type } from "@sinclair/typebox";
import {
  getChainByChainIdAsync,
  getChainBySlugAsync,
  minimizeChain,
} from "@thirdweb-dev/chains";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../middleware/error";
import {
  chainRequestQuerystringSchema,
  chainResponseSchema,
} from "../../schemas/chain";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

// OUPUT
const responseSchema = Type.Object({
  result: chainResponseSchema,
});

responseSchema.examples = [
  {
    result: {
      name: "Mumbai",
      chain: "Polygon",
      rpc: ["https://mumbai.rpc.thirdweb.com/${THIRDWEB_API_SECRET_KEY}"],
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
      },
      shortName: "maticmum",
      chainId: 80001,
      testnet: true,
      slug: "mumbai",
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
      operationId: "get",
      querystring: chainRequestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.query;

      let chainData = await getChainBySlugAsync(chain);
      if (!chainData) {
        chainData = await getChainByChainIdAsync(parseInt(chain));
      }

      if (!chainData) {
        const error = createCustomError(
          "Chain not found",
          StatusCodes.NOT_FOUND,
          "ChainNotFound",
        );
        throw error;
      }

      const minimizeChainData = minimizeChain(chainData);

      reply.status(StatusCodes.OK).send({
        result: {
          ...minimizeChainData,
          rpc: [chainData.rpc.length === 0 ? "" : minimizeChainData.rpc[0]],
        },
      });
    },
  });
}

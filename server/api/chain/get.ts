import { Static, Type } from "@sinclair/typebox";
import { allChains, minimizeChain } from "@thirdweb-dev/chains";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../core/index";
import { networkResponseSchema } from "../../../core/schema";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { networkRequestQuerystringSchema } from "../../schemas/network";

// OUPUT
const responseSchema = Type.Object({
  result: networkResponseSchema,
});

responseSchema.examples = [
  {
    result: {
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
  },
];

// LOGIC
export async function getChainData(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof networkRequestQuerystringSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/chain/get",
    schema: {
      description: "Get a particular chain information",
      tags: ["Chain"],
      operationId: "chain",
      querystring: networkRequestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network } = request.query;

      const chain = allChains.find((chain) => {
        if (
          chain.name === network ||
          chain.chainId === Number(network) ||
          chain.slug === network
        ) {
          return chain;
        }
      });

      if (!chain) {
        const error = createCustomError(
          "Chain not found",
          StatusCodes.NOT_FOUND,
          "ChainNotFound",
        );
        throw error;
      }

      const minimizeChainData = minimizeChain(chain);

      reply.status(StatusCodes.OK).send({
        result: {
          ...minimizeChainData,
          rpc: [chain.rpc.length === 0 ? "" : minimizeChainData.rpc[0]],
        },
      });
    },
  });
}

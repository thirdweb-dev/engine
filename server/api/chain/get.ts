import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError, getContractInstace } from "../../../core/index";
import { Static, Type } from "@sinclair/typebox";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { allChains, minimizeChain } from "@thirdweb-dev/chains";
import {
  chainRequestQuerystringSchema,
  chainResponseSchema,
} from "../../schemas/chain";

// OUPUT
const responseSchema = Type.Object({
  result: chainResponseSchema,
});

responseSchema.examples = [
  {
    result: {
      result: {
        name: "Mumbai",
        chain: "Polygon",
        rpc: ["https://mumbai.rpc.thirdweb.com/${THIRDWEB_API_KEY}"],
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
    Querystring: Static<typeof chainRequestQuerystringSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/chain/get",
    schema: {
      description: "Get a particular chain information",
      tags: ["Chain"],
      operationId: "getChainData",
      querystring: chainRequestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id } = request.query;

      const chain = allChains.find((chain) => {
        if (
          chain.name === chain_name_or_id ||
          chain.chainId === Number(chain_name_or_id) ||
          chain.slug === chain_name_or_id
        ) {
          return minimizeChain(chain);
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
          rpc: [minimizeChainData.rpc[0]],
        },
      });
    },
  });
}

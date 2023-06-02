import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError, getContractInstace } from "../../../core/index";
import { Static, Type } from "@sinclair/typebox";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { MinimalChain, allChains } from "@thirdweb-dev/chains";

// INPUT
const requestQuerySchema = Type.Object({
  chain_name_or_id: Type.String({
    description: "Chain name or id",
    examples: allChains.map((chain) => chain.name),
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Optional(
    Type.Object({
      name: Type.String({
        description: "Chain name",
      }),
      chain: Type.String({
        description: "Chain name",
      }),
      rpc: Type.String(),
      nativeCurrency: Type.Object({
        name: Type.String({
          description: "Native currency name",
        }),
        symbol: Type.String({
          description: "Native currency symbol",
        }),
        decimals: Type.Number({
          description: "Native currency decimals",
        }),
      }),
      shortName: Type.String({
        description: "Chain short name",
      }),
      chainId: Type.Number({
        description: "Chain ID",
      }),
      testnet: Type.Boolean({
        description: "Is testnet",
      }),
      slug: Type.String({
        description: "Chain slug",
      }),
    }),
  ),
});

responseSchema.examples = [
  {
    result: {
      name: "ERC20",
      symbol: "",
      decimals: "18",
    },
  },
];

// LOGIC
export async function getChainData(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof requestQuerySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/chain/get",
    schema: {
      description: "Get a particular chain information",
      tags: ["Chain"],
      operationId: "getChainData",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id } = request.query;

      const chain: MinimalChain | undefined = allChains.find(
        (chain) =>
          chain.name === chain_name_or_id ||
          chain.chainId === Number(chain_name_or_id),
      );

      if (!chain) {
        const error = createCustomError(
          "Chain not found",
          StatusCodes.NOT_FOUND,
          "ChainNotFound",
        );
        throw error;
      }

      reply.status(StatusCodes.OK).send({
        result: {
          ...chain,
          rpc: chain.rpc[0],
        },
      });
    },
  });
}

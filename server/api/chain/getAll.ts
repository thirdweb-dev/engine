import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { allChains, minimizeChain } from "@thirdweb-dev/chains";

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(
    Type.Object({
      name: Type.String({
        description: "Chain name",
      }),
      chain: Type.String({
        description: "Chain name",
      }),
      rpc: Type.Optional(Type.String()),
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
export async function getAllChainData(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/chain/getAll",
    schema: {
      description: "Get a particular chain information",
      tags: ["Chain"],
      operationId: "getAllChainData",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const chain = allChains.map((chain) => {
        return { ...minimizeChain(chain), rpc: chain?.rpc[0] };
      });

      reply.status(StatusCodes.OK).send({
        result: chain,
      });
    },
  });
}

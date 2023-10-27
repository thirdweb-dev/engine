import { Static, Type } from "@sinclair/typebox";
import { allChains, minimizeChain } from "@thirdweb-dev/chains";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { chainResponseSchema } from "../../schemas/chain";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(chainResponseSchema),
});

responseSchema.examples = [
  {
    result: [
      {
        name: "Ethereum Mainnet",
        chain: "ETH",
        rpc: ["https://ethereum.rpc.thirdweb.com/${THIRDWEB_API_SECRET_KEY}"],
        nativeCurrency: {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        shortName: "eth",
        chainId: 1,
        testnet: false,
        slug: "ethereum",
      },
      {
        name: "Ropsten",
        chain: "ETH",
        rpc: ["https://ropsten.rpc.thirdweb.com/${THIRDWEB_API_SECRET_KEY}"],
        nativeCurrency: {
          name: "Ropsten Ether",
          symbol: "ETH",
          decimals: 18,
        },
        shortName: "rop",
        chainId: 3,
        testnet: true,
        slug: "ropsten",
      },
    ],
  },
];

// LOGIC
export async function getAllChainData(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/chain/get-all",
    schema: {
      summary: "Get all chain details",
      description: "Get details about all supported chains.",
      tags: ["Chain"],
      operationId: "getAll",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const chain = allChains.map((chain) => {
        const minimizeChainData = minimizeChain(chain);
        if (chain.rpc.length === 0) {
          return { ...minimizeChainData, rpc: [""] };
        }
        return { ...minimizeChainData, rpc: [minimizeChainData.rpc[0]] };
      });

      reply.status(StatusCodes.OK).send({
        result: chain,
      });
    },
  });
}

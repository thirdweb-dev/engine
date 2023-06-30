import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { allChains, minimizeChain } from "@thirdweb-dev/chains";
import { networkResponseSchema } from "../../../core/schema";

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(networkResponseSchema),
});

responseSchema.examples = [
  {
    result: [
      {
        name: "Ethereum Mainnet",
        chain: "ETH",
        rpc: ["https://ethereum.rpc.thirdweb.com/${THIRDWEB_API_KEY}"],
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
        rpc: ["https://ropsten.rpc.thirdweb.com/${THIRDWEB_API_KEY}"],
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
    url: "/network/getAll",
    schema: {
      description: "Get all networks/chains information",
      tags: ["Network"],
      operationId: "getAllNetworkData",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const chain = allChains.map((chain) => {
        if (chain.rpc.length === 0) {
          request.log.warn(
            `Chain ${chain.name} ${chain.rpc} has no RPC endpoint. Please add more endpoints.`,
          );
        }
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

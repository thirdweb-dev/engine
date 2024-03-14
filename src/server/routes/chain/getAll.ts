import { Static, Type } from "@sinclair/typebox";
import { Chain, fetchChains, minimizeChain } from "@thirdweb-dev/chains";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../utils/cache/getConfig";
import { chainResponseSchema } from "../../schemas/chain";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

// OUTPUT
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
      const allChainsData = await fetchChains();
      const config = await getConfig();

      let chain = (allChainsData ?? ([] as Chain[])).map((chain) => {
        const minimizeChainData = minimizeChain(chain);
        if (chain.rpc.length === 0) {
          return { ...minimizeChainData, rpc: [""] };
        }
        return { ...minimizeChainData, rpc: [minimizeChainData.rpc[0]] };
      });

      let chainOverrides: typeof chain = [];

      if (config.chainOverrides) {
        chainOverrides = (JSON.parse(config.chainOverrides) as Chain[]).map(
          (overrideChain) => {
            const shortName = overrideChain.shortName
              ? overrideChain.shortName
              : "";
            const rpc =
              overrideChain.rpc.length === 0 ? [""] : [overrideChain.rpc[0]];
            return { ...overrideChain, shortName, rpc };
          },
        );
      }

      // Concatenate chain and chainOverrides
      chain = chain.concat(chainOverrides);

      reply.status(StatusCodes.OK).send({
        result: chain,
      });
    },
  });
}

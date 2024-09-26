import { Type } from "@sinclair/typebox";
import { fetchChains } from "@thirdweb-dev/chains";
import type { FastifyInstance } from "fastify";
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
      operationId: "listChains",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const allChains = (await fetchChains()) ?? [];
      const config = await getConfig();

      for (const chain of config.chainOverridesParsed) {
        allChains.push({
          chainId: chain.id,
          name: chain.name ?? "",
          rpc: [...chain.rpc],
          nativeCurrency: {
            name: chain.nativeCurrency?.name ?? "Ether",
            symbol: chain.nativeCurrency?.symbol ?? "ETH",
            decimals: chain.nativeCurrency?.decimals ?? 18,
          },
          testnet: chain.testnet ?? false,
          chain: "",
          shortName: "",
          slug: "",
        });
      }

      reply.status(StatusCodes.OK).send({
        result: allChains.map((chain) => ({
          ...chain,
          rpc: [...chain.rpc],
        })),
      });
    },
  });
}

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../shared/utils/cache/get-contract";
import { englishAuctionOutputSchema } from "../../../../../../schemas/marketplaceV3/englishAuction";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utils/chain";
import { formatEnglishAuctionResult } from "../../../../../../utils/marketplaceV3";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listingId: Type.String({
    description: "The id of the listing to retrieve.",
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: englishAuctionOutputSchema,
});

responseSchema.examples = [
  {
    result: [
      {
        metadata: {
          id: "0",
          uri: "ipfs://QmdaWX1GEwnFW4NooYRej5BQybKNLdxkWtMwyw8KiWRueS/0",
          name: "My Edition NFT",
          description: "My Edition NFT description",
          image:
            "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
        },
        owner: "0xE79ee09bD47F4F5381dbbACaCff2040f2FbC5803",
        type: "ERC1155",
        supply: "100",
        quantityOwned: "100",
      },
    ],
  },
];

// LOGIC
export async function englishAuctionsGetAuction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contractAddress/english-auctions/get-auction",
    schema: {
      summary: "Get English auction",
      description:
        "Get a specific English auction listing on this marketplace contract.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "getEnglishAuction",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { listingId } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const result = await contract.englishAuctions.getAuction(listingId);

      reply.status(StatusCodes.OK).send({
        result: formatEnglishAuctionResult(result),
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { directListingV3OutputSchema } from "../../../../../../schemas/marketplaceV3/directListing";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getContract } from "../../../../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../../../../utils/chain";
import { formatDirectListingV3Result } from "../../../../../../utils/marketplaceV3";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listing_id: Type.String({
    description: "The id of the listing to retrieve.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: directListingV3OutputSchema,
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
export async function directListingsGetListing(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contract_address/direct-listings/get-listing",
    schema: {
      summary: "Get direct listing",
      description: "Gets a direct listing on this marketplace contract.",
      tags: ["Marketplace-DirectListings"],
      operationId: "getListing",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { listing_id } = request.query;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const result = await contract.directListings.getListing(listing_id);

      reply.status(StatusCodes.OK).send({
        result: formatDirectListingV3Result(result),
      });
    },
  });
}

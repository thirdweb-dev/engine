import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { OfferV3OutputSchema } from "../../../../../../schemas/marketplaceV3/offer";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getContract } from "../../../../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../../../../utils/chain";
import { formatOffersV3Result } from "../../../../../../utils/marketplaceV3";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  offerId: Type.String({
    description: "The ID of the offer to get information about.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: OfferV3OutputSchema,
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
export async function offersGetOffer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contractAddress/offers/get-offer",
    schema: {
      summary: "Get offer",
      description: "Get details about an offer.",
      tags: ["Marketplace-Offers"],
      operationId: "getOffer",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { offerId } = request.query;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const result = await contract.offers.getOffer(offerId);

      reply.status(StatusCodes.OK).send({
        result: formatOffersV3Result(result),
      });
    },
  });
}

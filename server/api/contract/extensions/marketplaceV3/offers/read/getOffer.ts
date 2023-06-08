import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { OfferV3OutputSchema } from "../../../../../../schemas/marketplaceV3/offer";
import { formatOffersV3Result } from "../../../../../../helpers/marketplaceV3";

// INPUT
const requestSchema = contractParamSchema;
const requestQuerySchema = Type.Object({
  offer_id: Type.String({
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
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/offers/getOffer",
    schema: {
      description:
        "Get information about a specific offer using the offer’s ID.",
      tags: ["MarketplaceV3-Offers"],
      operationId: "mktpv3_offers_getOffer",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { offer_id } = request.query;
      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.offers.getOffer(offer_id);

      reply.status(StatusCodes.OK).send({
        result: formatOffersV3Result(result),
      });
    },
  });
}

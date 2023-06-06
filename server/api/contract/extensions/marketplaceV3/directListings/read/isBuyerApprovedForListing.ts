import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";

// INPUT
const requestSchema = contractParamSchema;
const requestQuerySchema = Type.Object({
  listing_id: Type.String({
    description: "The id of the listing to retrieve.",
  }),
  wallet_address: Type.String({
    description: "The wallet address of the buyer to check.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Boolean(),
});

responseSchema.examples = [
  {
    result: true,
  },
];

// LOGIC
export async function dlIsBuyerApprovedForListing(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/directListing/isBuyerApprovedForListing",
    schema: {
      description:
        "Check if a buyer is approved to purchase a reserved listing.",
      tags: ["MarketplaceV3-DirectListing"],
      operationId: "mktpv3_isBuyerApprovedForListing",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { listing_id, wallet_address } = request.query;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.directListings.isBuyerApprovedForListing(
        listing_id,
        wallet_address,
      );

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

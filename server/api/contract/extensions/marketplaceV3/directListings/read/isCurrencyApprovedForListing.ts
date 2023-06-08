import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../../core";
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
  currency_contract_address: Type.String({
    description: "The smart contract address of the ERC20 token to check.",
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
export async function directListingsIsCurrencyApprovedForListing(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/directlistings/isCurrencyApprovedForListing",
    schema: {
      description:
        "Check whether you can use a specific currency to purchase a listing.",
      tags: ["MarketplaceV3-DirectListings"],
      operationId: "mktpv3_directListings_isCurrencyApprovedForListing",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { listing_id, currency_contract_address } = request.query;
      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.directListings.isCurrencyApprovedForListing(
        listing_id,
        currency_contract_address,
      );

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
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
    url: "/marketplace/:network/:contract_address/directListings/isCurrencyApprovedForListing",
    schema: {
      description:
        "Check whether you can use a specific currency to purchase a listing.",
      tags: ["Marketplace-DirectListings"],
      operationId: "mktpv3_directListings_isCurrencyApprovedForListing",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { listing_id, currency_contract_address } = request.query;
      const contract = await getContractInstance(network, contract_address);
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

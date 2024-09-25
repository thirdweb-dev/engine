import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../utils/cache/getContract";
import { AddressSchema } from "../../../../../../schemas/address";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listingId: Type.String({
    description: "The id of the listing to retrieve.",
  }),
  currencyContractAddress: {
    ...AddressSchema,
    description: "The smart contract address of the ERC20 token to check.",
  },
});

// OUTPUT
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
    url: "/marketplace/:chain/:contractAddress/direct-listings/is-currency-approved-for-listing",
    schema: {
      summary: "Check approved currency",
      description:
        "Check if a currency is approved for a specific direct listing.",
      tags: ["Marketplace-DirectListings"],
      operationId: "isCurrencyApprovedForListing",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { listingId, currencyContractAddress } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const result = await contract.directListings.isCurrencyApprovedForListing(
        listingId,
        currencyContractAddress,
      );

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../../core/schema";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utilities/chain";
import { getContract } from "../../../../../../utils/cache/getContract";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
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
export async function directListingsIsBuyerApprovedForListing(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:network/:contract_address/directListings/isBuyerApprovedForListing",
    schema: {
      description:
        "Check if a buyer is approved to purchase a reserved listing.",
      tags: ["Marketplace-DirectListings"],
      operationId: "mktpv3_directListings_isBuyerApprovedForListing",
      headers: walletAuthSchema,
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { listing_id, wallet_address } = request.query;
      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
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

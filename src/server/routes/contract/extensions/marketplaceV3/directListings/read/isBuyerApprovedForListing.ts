import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../utils/cache/getContract";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listingId: Type.String({
    description: "The id of the listing to retrieve.",
  }),
  walletAddress: Type.String({
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
    url: "/marketplace/:chain/:contractAddress/direct-listings/is-buyer-approved-for-listing",
    schema: {
      summary: "Check approved buyer",
      description:
        "Check if a buyer is approved to purchase a specific direct listing.",
      tags: ["Marketplace-DirectListings"],
      operationId: "isBuyerApprovedForListing",
      headers: walletAuthSchema,
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
      const { listingId, walletAddress } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const result = await contract.directListings.isBuyerApprovedForListing(
        listingId,
        walletAddress,
      );

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

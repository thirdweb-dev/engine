import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { directListingV3InputSchema } from "../../../../../../schemas/marketplaceV3/directListing";
import { queueTransaction } from "../../../../../../helpers";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestBodySchema = Type.Object({
  listing_id: Type.String({
    description: "The ID of the listing you want to approve a buyer for.",
  }),
  buyer_address: Type.String({
    description: "The wallet address of the buyer to approve.",
  }),
});

requestBodySchema.examples = [
  {
    listing_id: "0",
    buyer_address: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
  },
];

// LOGIC
export async function directListingsRevokeBuyerApprovalForReservedListing(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/:network/:contract_address/directListings/revokeBuyerApprovalForReservedListing",
    schema: {
      description:
        "Revoke approval for a buyer to purchase a reserved listing.",
      tags: ["Marketplace-DirectListings"],
      operationId:
        "mktpv3_directListings_revokeBuyerApprovalForReservedListing",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { listing_id, buyer_address } = request.body;

      const contract = await getContractInstance(network, contract_address);
      const tx =
        await contract.directListings.revokeBuyerApprovalForReservedListing.prepare(
          listing_id,
          buyer_address,
        );

      const queuedId = await queueTransaction(
        request,
        tx,
        network,
        "V3-directListings",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}

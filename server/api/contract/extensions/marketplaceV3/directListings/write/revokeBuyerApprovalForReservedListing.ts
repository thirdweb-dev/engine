import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { directListingV3InputSchema } from "../../../../../../schemas/marketplaceV3/directListing";
import { queueTransaction } from "../../../../../../helpers";

// INPUT
const requestSchema = contractParamSchema;
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
export async function dlRevokeBuyerApprovalForReservedListing(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/directListing/revokeBuyerApprovalForReservedListing",
    schema: {
      description:
        "Revoke approval for a buyer to purchase a reserved listing.",
      tags: ["MarketplaceV3-DirectListings"],
      operationId: "mktpv3_revokeBuyerApprovalForReservedListing",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { listing_id, buyer_address } = request.body;

      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const tx =
        await contract.directListings.revokeBuyerApprovalForReservedListing.prepare(
          listing_id,
          buyer_address,
        );

      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "mktV3-directListings",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}

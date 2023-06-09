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
  currency_contract_address: Type.String({
    description: "The wallet address of the buyer to approve.",
  }),
});

requestBodySchema.examples = [
  {
    listing_id: "0",
    currency_contract_address: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
  },
];

// LOGIC
export async function directListingsRevokeCurrencyApprovalForListing(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/directlistings/revokeCurrencyApprovalForListing",
    schema: {
      description:
        "Revoke approval for a buyer to purchase a reserved listing.",
      tags: ["MarketplaceV3-DirectListings"],
      operationId: "mktpv3_directListings_revokeCurrencyApprovalForListing",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { listing_id, currency_contract_address } = request.body;

      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const tx =
        await contract.directListings.revokeCurrencyApprovalForListing.prepare(
          listing_id,
          currency_contract_address,
        );

      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "V3-directListings",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}

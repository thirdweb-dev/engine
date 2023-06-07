import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../../helpers";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  listing_id: Type.String({
    description: "The ID of the listing you want to approve a buyer for.",
  }),
  buyer: Type.String({
    description: "The wallet address of the buyer to approve.",
  }),
});

requestBodySchema.examples = [
  {
    listing_id: "0",
    buyer: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
  },
];

// LOGIC
export async function directListingsApproveBuyerForReservedListing(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/directlistings/approveBuyerForReservedListing",
    schema: {
      description:
        "Approve a wallet address to be able to buy a reserved listing.",
      tags: ["MarketplaceV3-DirectListings"],
      operationId: "mktpv3_directListings_approveBuyerForReservedListing",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { listing_id, buyer } = request.body;

      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const tx =
        await contract.directListings.approveBuyerForReservedListing.prepare(
          listing_id,
          buyer,
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

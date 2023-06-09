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
const requestBodySchema = directListingV3InputSchema;

requestBodySchema.examples = [
  {
    assetContractAddress: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
    tokenId: "0",
    pricePerToken: "0.00000001",
    isReservedListing: false,
    quantity: "1",
    startTimestamp: 1686006043038,
    endTimestamp: 1686610889058,
  },
];

// LOGIC
export async function directListingsCreateListing(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/directlistings/createListing",
    schema: {
      description: "Create a new direct listing on the marketplace.",
      tags: ["MarketplaceV3-DirectListings"],
      operationId: "mktpv3_directListings_createListing",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const {
        assetContractAddress,
        tokenId,
        pricePerToken,
        currencyContractAddress,
        isReservedListing,
        quantity,
        startTimestamp,
        endTimestamp,
      } = request.body;

      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.directListings.createListing.prepare({
        assetContractAddress,
        tokenId,
        pricePerToken,
        currencyContractAddress,
        isReservedListing,
        quantity,
        startTimestamp,
        endTimestamp,
      });

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

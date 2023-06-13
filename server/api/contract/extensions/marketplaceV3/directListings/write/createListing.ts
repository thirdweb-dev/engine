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
    url: "/marketplace/:network/:contract_address/directListings/createListing",
    schema: {
      description: "Create a new direct listing on the marketplace.",
      tags: ["Marketplace-DirectListings"],
      operationId: "mktpv3_directListings_createListing",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
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

      const contract = await getContractInstance(network, contract_address);
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
        network,
        "V3-directListings",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}

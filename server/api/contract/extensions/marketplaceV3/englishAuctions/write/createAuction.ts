import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../../helpers";
import { englishAuctionInputSchema } from "server/schemas/marketplaceV3/englishAuction";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = englishAuctionInputSchema;

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
export async function eaCreateAuction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/englishAuction/createAuction",
    schema: {
      description: "Create a new auction listing on the marketplace.",
      tags: ["MarketplaceV3-EnglishAuctions"],
      operationId: "mktpv3_eaCreateAuction",
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
        buyoutBidAmount,
        minimumBidAmount,
        currencyContractAddress,
        quantity,
        startTimestamp,
        endTimestamp,
        bidBufferBps,
        timeBufferInSeconds,
      } = request.body;

      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.englishAuctions.createAuction.prepare({
        assetContractAddress,
        tokenId,
        buyoutBidAmount,
        minimumBidAmount,
        currencyContractAddress,
        quantity,
        startTimestamp,
        endTimestamp,
        bidBufferBps,
        timeBufferInSeconds,
      });

      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "mktplcV3-englishAuction",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}

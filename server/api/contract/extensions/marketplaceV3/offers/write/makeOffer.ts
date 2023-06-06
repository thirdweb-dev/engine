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
import { OfferV3InputSchema } from "../../../../../../schemas/marketplaceV3/offer";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = OfferV3InputSchema;

requestBodySchema.examples = [
  {
    assetContractAddress: "0x19411143085F1ec7D21a7cc07000CBA5188C5e8e",
    tokenId: "0",
    quantity: "1",
    endTimestamp: 1686610889058,
    currencyContractAddress: "0x...",
    totalPrice: "0.00000001",
  },
];

// LOGIC
export async function offersMakeOffer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/offers/makeOffer",
    schema: {
      description:
        "Make a new offer on an NFT. Offers can be made on any NFT, regardless of whether it is listed for sale or not.",
      tags: ["MarketplaceV3-Offers"],
      operationId: "mktpv3_offerMakeOffer",
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
        totalPrice,
        currencyContractAddress,
        endTimestamp,
        quantity,
      } = request.body;

      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.offers.makeOffer.prepare({
        assetContractAddress,
        tokenId,
        totalPrice,
        currencyContractAddress,
        endTimestamp,
        quantity,
      });

      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "mktV3-offers",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}

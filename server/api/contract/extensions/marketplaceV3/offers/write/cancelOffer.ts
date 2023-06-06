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

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  offer_id: Type.String({
    description:
      "The ID of the offer to cancel. You can view all offers with getAll or getAllValid.",
  }),
});

requestBodySchema.examples = [
  {
    offer_id: "1",
  },
];

// LOGIC
export async function offersCancelOffer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/offers/cancelOffer",
    schema: {
      description: "Cancel an offer you made on an NFT.",
      tags: ["MarketplaceV3-Offers"],
      operationId: "mktpv3_offerCancelOffer",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { offer_id } = request.body;

      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.offers.cancelOffer.prepare(offer_id);

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

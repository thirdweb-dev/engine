import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";

// INPUT
const requestSchema = contractParamSchema;
const requestQuerySchema = Type.Object({
  listing_id: Type.String({
    description: "The ID of the listing to retrieve the winner for.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.String(),
});

responseSchema.examples = [
  {
    result: "0x...",
  },
];

// LOGIC
export async function eaGetAuction(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/englishAuction/getWinner",
    schema: {
      description:
        "Get the wallet address that won an auction. Can only be called after the auction has ended.",
      tags: ["MarketplaceV3-EnglishAuction"],
      operationId: "mktpv3_eaGetWinner",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { listing_id } = request.query;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.englishAuctions.getWinner(listing_id);

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

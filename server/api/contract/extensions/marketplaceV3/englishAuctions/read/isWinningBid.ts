import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { bidSchema } from "../../../../../../schemas/marketplaceV3/englishAuction";

// INPUT
const requestSchema = contractParamSchema;
const requestQuerySchema = Type.Object({
  listing_id: Type.String({
    description: "The ID of the listing to retrieve the winner for.",
  }),
  bid_amount: Type.String({
    description: "The amount of the bid to check if it is the winning bid.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Boolean(),
});

responseSchema.examples = [
  {
    result: true,
  },
];

// LOGIC
export async function eaIsWinningBid(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/englishAuction/isWinningBid",
    schema: {
      description:
        "Check if a value is/would be the current winning bid of an auction.",
      tags: ["MarketplaceV3-EnglishAuctions"],
      operationId: "mktpv3_eaIsWinningBid",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { listing_id, bid_amount } = request.query;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.englishAuctions.isWinningBid(
        listing_id,
        bid_amount,
      );

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

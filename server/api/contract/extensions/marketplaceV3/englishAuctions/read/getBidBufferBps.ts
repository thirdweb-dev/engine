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
    description: "The id of the listing to retrieve.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Number({
    description:
      "Returns a number representing the basis points of the bid buffer.",
  }),
});

responseSchema.examples = [
  {
    result: "1",
  },
];

// LOGIC
export async function eaGetBidBufferBps(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/englishAuction/getBidBufferBps",
    schema: {
      description: `Get the basis points of the bid buffer. 
        This is the percentage higher that a new bid must be than the current highest bid in order to be placed. 
        If there is no current bid, the bid must be at least the minimum bid amount.
        Returns the value in percentage format, e.g. 100 = 1%.`,
      tags: ["MarketplaceV3-EnglishAuctions"],
      operationId: "mktpv3_eaGetBidBufferBps",
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
      const result = await contract.englishAuctions.getBidBufferBps(listing_id);

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

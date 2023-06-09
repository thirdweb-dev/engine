import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../../core";
import { Static, Type } from "@sinclair/typebox";
import {
  marketplaceV3ContractParamSchema,
  currencyValueSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listing_id: Type.String({
    description: "The id of the listing to retrieve.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: currencyValueSchema,
});

responseSchema.examples = [
  {
    result: "1",
  },
];

// LOGIC
export async function englishAuctionsGetMinimumNextBid(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/v3/:chain_name_or_id/:contract_address/englishauctions/getMinimumNextBid",
    schema: {
      description: `Helper function to calculate the value that the next bid must be in order to be accepted. 
        If there is no current bid, the bid must be at least the minimum bid amount.
        If there is a current bid, the bid must be at least the current bid amount + the bid buffer.`,
      tags: ["MarketplaceV3-EnglishAuctions"],
      operationId: "mktpv3_englishAuctions_getMinimumNextBid",
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
      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.englishAuctions.getMinimumNextBid(
        listing_id,
      );

      reply.status(StatusCodes.OK).send({
        result: {
          ...result,
          value: result.value.toString(),
        },
      });
    },
  });
}

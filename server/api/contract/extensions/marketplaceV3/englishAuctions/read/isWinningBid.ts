import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utilities/chain";
import { getContract } from "../../../../../../utils/cache/getContract";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
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
export async function englishAuctionsIsWinningBid(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contract_address/english-auctions/is-winning-bid",
    schema: {
      summary: "Check winning bid",
      description:
        "Check if a bid is or will be the winning bid for an auction.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "mktpv3_englishAuctions_isWinningBid",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { listing_id, bid_amount } = request.query;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
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

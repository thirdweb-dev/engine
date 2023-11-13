import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../utils/cache/getContract";
import { bidSchema } from "../../../../../../schemas/marketplaceV3/englishAuction";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listingId: Type.String({
    description: "The ID of the listing to retrieve the winner for.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Optional(bidSchema),
});

responseSchema.examples = [
  {
    result: "0x...",
  },
];

// LOGIC
export async function englishAuctionsGetWinningBid(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contractAddress/english-auctions/get-winning-bid",
    schema: {
      summary: "Get winning bid",
      description: "Get the current highest bid of an active auction.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "getWinningBid",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { listingId } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const result = await contract.englishAuctions.getWinningBid(listingId);

      reply.status(StatusCodes.OK).send({
        result: {
          ...result,
          bidAmountCurrencyValue: {
            ...result?.bidAmountCurrencyValue,
            value: result?.bidAmountCurrencyValue.value.toString(),
          },
        },
      });
    },
  });
}

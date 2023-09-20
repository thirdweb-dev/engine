import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../helpers/sharedApiSchemas";
import { bidSchema } from "../../../../../../schemas/marketplaceV3/englishAuction";
import { getChainIdFromChain } from "../../../../../../utilities/chain";
import { getContract } from "../../../../../../utils/cache/getContract";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listing_id: Type.String({
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
    url: "/marketplace/:network/:contract_address/englishAuctions/getWinningBid",
    schema: {
      description: "Get the current highest bid of an active auction.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "mktpv3_englishAuctions_GetWinningBid",
      params: requestSchema,
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { listing_id } = request.query;
      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const result = await contract.englishAuctions.getWinningBid(listing_id);

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

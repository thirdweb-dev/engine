import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../utils/cache/getContract";
import {
  currencyValueSchema,
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listingId: Type.String({
    description: "The id of the listing to retrieve.",
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: currencyValueSchema,
});

responseSchema.examples = [
  {
    result: "10000000000",
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
    url: "/marketplace/:chain/:contractAddress/english-auctions/get-minimum-next-bid",
    schema: {
      summary: "Get minimum next bid",
      description: `Helper function to calculate the value that the next bid must be in order to be accepted. 
If there is no current bid, the bid must be at least the minimum bid amount.
If there is a current bid, the bid must be at least the current bid amount + the bid buffer.`,
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "getEnglishAuctionsMinimumNextBid",
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
      const result =
        await contract.englishAuctions.getMinimumNextBid(listingId);

      reply.status(StatusCodes.OK).send({
        result: {
          ...result,
          value: result.value.toString(),
        },
      });
    },
  });
}

import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../utils/cache/getContract";
import {
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
  result: Type.Integer({
    description:
      "Returns a number representing the basis points of the bid buffer.",
  }),
});

responseSchema.examples = [
  {
    result: 1,
  },
];

// LOGIC
export async function englishAuctionsGetBidBufferBps(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contractAddress/english-auctions/get-bid-buffer-bps",
    schema: {
      summary: "Get bid buffer BPS",
      description: `Get the basis points of the bid buffer. 
This is the percentage higher that a new bid must be than the current highest bid in order to be placed. 
If there is no current bid, the bid must be at least the minimum bid amount.
Returns the value in percentage format, e.g. 100 = 1%.`,
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "getEnglishAuctionsBidBufferBps",
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
      const result = await contract.englishAuctions.getBidBufferBps(listingId);

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../shared/utils/cache/get-contract";
import {
  marketplaceV3ContractParamSchema,
  standardResponseSchema,
} from "../../../../../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = marketplaceV3ContractParamSchema;
const requestQuerySchema = Type.Object({
  listingId: Type.String({
    description: "The ID of the listing to retrieve the winner for.",
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.String(),
});

responseSchema.examples = [
  {
    result: "0x...",
  },
];

// LOGIC
export async function englishAuctionsGetWinner(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contractAddress/english-auctions/get-winner",
    schema: {
      summary: "Get winner",
      description:
        "Get the winner of an English auction. Can only be called after the auction has ended.",
      tags: ["Marketplace-EnglishAuctions"],
      operationId: "getEnglishAuctionsWinner",
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
      const result = await contract.englishAuctions.getWinner(listingId);

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

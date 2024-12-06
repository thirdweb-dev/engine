import { Type, type Static } from "@sinclair/typebox";
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

// OUTPUT
const responseSchema = Type.Object({
  result: Type.String(),
});

responseSchema.examples = [
  {
    result: "1",
  },
];

// LOGIC
export async function offersGetTotalCount(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/marketplace/:chain/:contractAddress/offers/get-total-count",
    schema: {
      summary: "Get total count",
      description:
        "Get the total number of offers on this marketplace contract.",
      tags: ["Marketplace-Offers"],
      operationId: "getMarketplaceOffersTotalCount",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const result = await contract.englishAuctions.getTotalCount();

      reply.status(StatusCodes.OK).send({
        result: result.toString(),
      });
    },
  });
}

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../shared/utils/cache/get-contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Optional(Type.String()),
});

// LOGIC
export async function erc721TotalClaimedSupply(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc721/total-claimed-supply",
    schema: {
      summary: "Get claimed supply",
      description: "Get the claimed supply for this ERC-721 contract.",
      tags: ["ERC721"],
      operationId: "erc721-totalClaimedSupply",
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
      const returnData = await contract.erc721.totalClaimedSupply();
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}

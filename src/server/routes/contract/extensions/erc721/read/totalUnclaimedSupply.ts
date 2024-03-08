import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getTotalUnclaimedSupply } from "thirdweb/extensions/erc721";
import { getContractV5 } from "../../../../../../utils/cache/getContractV5";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";
// INPUT
const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.String(),
});

// LOGIC
export async function erc721TotalUnclaimedSupply(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc721/total-unclaimed-supply",
    schema: {
      summary: "Get unclaimed supply",
      description: "Get the unclaimed supply for this ERC-721 contract.",
      tags: ["ERC721"],
      operationId: "totalUnclaimedSupply",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const returnData = await getTotalUnclaimedSupply({
        contract,
      });
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}

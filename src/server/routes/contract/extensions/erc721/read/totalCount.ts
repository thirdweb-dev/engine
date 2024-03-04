import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { totalSupply } from "thirdweb/extensions/erc721";
import { getContractV5 } from "../../../../../../utils/cache/getContractV5";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;

// OUPUT
const responseSchema = Type.Object({
  result: Type.Optional(Type.String()),
});

responseSchema.example = [
  {
    result: "1",
  },
];

// LOGIC
export async function erc721TotalCount(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc721/total-count",
    schema: {
      summary: "Get total supply",
      description:
        "Get the total supply in circulation for this ERC-721 contract.",
      tags: ["ERC721"],
      operationId: "totalCount",
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
      const returnData = await totalSupply({ contract });
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUT
const requestSchema = contractParamSchema;

// OUPUT
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
    url: "/contract/:chain/:contract_address/erc721/total-claimed-supply",
    schema: {
      summary: "Get claimed supply",
      description: "Get the claimed supply for this ERC-721 contract.",
      tags: ["ERC721"],
      operationId: "totalClaimedSupply",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
      const returnData = await contract.erc721.totalClaimedSupply();
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getMinMaxBlockNumber } from "../../../../db/contractLogs/getContractLogs";
import { createCustomError } from "../../../middleware/error";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const responseSchema = Type.Object({
  result: Type.Object({
    chain: Type.String(),
    contractAddress: Type.String(),
    firstIndexedBlock: Type.Number(),
    lastIndexedBlock: Type.Number(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    chain: "ethereum",
    contractAddress: "0x....",
    firstIndexedBlock: 100,
    lastIndexedBlock: 200,
    status: "success",
  },
};

export async function getIndexedBlocksRoute(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/indexer/getIndexedBlocks",
    schema: {
      summary: "Gets the indexed blocks for the contract",
      description: "Gets the indexed blocks for the contract",
      tags: ["Contract", "Index"],
      operationId: "read",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const chainId = await getChainIdFromChain(chain);

      const result = await getMinMaxBlockNumber(chainId, contractAddress);

      if (!result.minBlockNumber || !result.maxBlockNumber) {
        const error = createCustomError(
          `No logs found for chainId: ${chainId}, contractAddress: ${contractAddress}`,
          StatusCodes.NOT_FOUND,
          "LOG_NOT_FOUND",
        );
        throw error;
      }

      reply.status(StatusCodes.OK).send({
        result: {
          chain,
          contractAddress,
          firstIndexedBlock: result.minBlockNumber,
          lastIndexedBlock: result.maxBlockNumber,
          status: "success",
        },
      });
    },
  });
}

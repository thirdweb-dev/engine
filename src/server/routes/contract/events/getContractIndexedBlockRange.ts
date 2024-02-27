import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractEventLogsIndexedBlockRange } from "../../../../db/contractEventLogs/getContractEventLogs";
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
    fromBlock: Type.Number(),
    toBlock: Type.Number(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    chain: "ethereum",
    contractAddress: "0x....",
    fromBlock: 100,
    toBlock: 200,
    status: "success",
  },
};

export async function getContractIndexedBlockRange(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/events/get-indexed-blocks",
    schema: {
      summary: "Get indexed block range",
      description: "Gets the subscribed contract's indexed block range",
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

      const result = await getContractEventLogsIndexedBlockRange({
        chainId,
        contractAddress,
      });

      if (!result.fromBlock || !result.toBlock) {
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
          fromBlock: result.fromBlock,
          toBlock: result.toBlock,
          status: "success",
        },
      });
    },
  });
}

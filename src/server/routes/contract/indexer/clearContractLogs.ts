import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteContractLogs } from "../../../../db/contractLogs/deleteContractLogs";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const responseSchema = Type.Object({
  result: Type.Object({
    chain: Type.String(),
    contractAddress: Type.String(),
    rows: Type.Number(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    chain: "ethereum",
    contractAddress: "0x....",
    row: 100,
    status: "success",
  },
};

export async function clearContractLogs(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/indexer/deleteLogs",
    schema: {
      summary: "Delete indexed contract logs",
      description: "Deletes the logs indexed for the contract",
      tags: ["Contract", "Index"],
      operationId: "write",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const chainId = await getChainIdFromChain(chain);

      const deletedLogs = await deleteContractLogs({
        chainId,
        contractAddress,
      });

      await reply.status(StatusCodes.OK).send({
        result: {
          chain,
          contractAddress,
          rows: deletedLogs.count,
          status: "success",
        },
      });
    },
  });
}

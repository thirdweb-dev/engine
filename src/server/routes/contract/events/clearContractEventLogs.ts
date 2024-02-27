import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteContractEventLogs } from "../../../../db/contractEventLogs/deleteContractLogs";
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

export async function clearContractEventLogs(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/events/clear",
    schema: {
      summary: "Clears saved contract logs",
      description: "Clears saved contract logs for a subscribed contract",
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

      const deletedLogs = await deleteContractEventLogs({
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

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteContractEventLogs } from "../../../../db/contractEventLogs/deleteContractEventLogs";
import { deleteContractSubscription } from "../../../../db/contractSubscriptions/deleteContractSubscription";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const responseSchema = Type.Object({
  result: Type.Object({
    chain: Type.String(),
    contractAddress: Type.String(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    chain: "ethereum",
    contractAddress: "0x....",
    status: "success",
  },
};

export async function removeContractSubscription(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/unsubscribe",
    schema: {
      summary: "Unsubscribe from contract events",
      description: "Unsubscribe from contract events",
      tags: ["Contract-Subscriptions"],
      operationId: "removeContractSubscription",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const standardizedContractAddress = contractAddress.toLowerCase();
      const chainId = await getChainIdFromChain(chain);

      await deleteContractSubscription({
        chainId,
        contractAddress: standardizedContractAddress,
      });

      await deleteContractEventLogs({
        chainId,
        contractAddress: standardizedContractAddress,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          chain,
          contractAddress: standardizedContractAddress,
          status: "success",
        },
      });
    },
  });
}

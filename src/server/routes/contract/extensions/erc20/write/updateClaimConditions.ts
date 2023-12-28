import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import { claimConditionInputSchema } from "../../../../../schemas/claimConditions";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  claimConditionInput: claimConditionInputSchema,
  index: Type.Number({
    description: "Index of the claim condition to update",
  }),
});

// LOGIC
export async function erc20UpdateClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/claim-conditions/update",
    schema: {
      summary: "Update a single claim phase.",
      description:
        "Update a single claim phase, by providing the index of the claim phase and the new phase configuration. The index is the position of the phase in the list of phases you have made, starting from zero. e.g. if you have two phases, the first phase has an index of 0 and the second phase has an index of 1. All properties of a phase are optional, with the default being a free, open, unlimited claim, in the native currency, starting immediately.",
      tags: ["ERC20"],
      operationId: "updateClaimConditions",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { claimConditionInput, index } = request.body;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const tx = await contract.erc20.claimConditions.update.prepare(
        index,
        claimConditionInput,
      );
      const queueId = await queueTx({ tx, chainId, extension: "erc20" });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

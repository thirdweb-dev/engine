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
  claimConditionInputs: Type.Array(claimConditionInputSchema),
  resetClaimEligibilityForAll: Type.Optional(Type.Boolean()),
});

// LOGIC
export async function erc721SetClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/claim-conditions/set",
    schema: {
      summary: "Overwrite the claim conditions for the drop.",
      description:
        "Overwrite the claim conditions for the drop. All properties of a phase are optional, with the default being a free, open, unlimited claim, in the native currency, starting immediately.",
      tags: ["ERC721"],
      operationId: "setClaimConditions",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { claimConditionInputs, resetClaimEligibilityForAll } =
        request.body;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const tx = await contract.erc721.claimConditions.set.prepare(
        claimConditionInputs,
        resetClaimEligibilityForAll,
      );
      const queueId = await queueTx({ tx, chainId, extension: "erc721" });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

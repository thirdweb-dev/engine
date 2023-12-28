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
  tokenId: Type.Union([Type.String(), Type.Number()], {
    description: "ID of the token to set the claim conditions for",
  }),
  claimConditionInputs: Type.Array(claimConditionInputSchema),
  resetClaimEligibilityForAll: Type.Optional(Type.Boolean()),
});

// LOGIC
export async function erc1155SetClaimCondition(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/set",
    schema: {
      summary: "Overwrite the claim conditions for a specific token ID..",
      description:
        "Overwrite the claim conditions for a specific token ID. All properties of a phase are optional, with the default being a free, open, unlimited claim, in the native currency, starting immediately.",
      tags: ["ERC1155"],
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
      const { tokenId, claimConditionInputs, resetClaimEligibilityForAll } =
        request.body;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const tx = await contract.erc1155.claimConditions.set.prepare(
        tokenId,
        claimConditionInputs,
        resetClaimEligibilityForAll,
      );
      const queueId = await queueTx({ tx, chainId, extension: "erc1155" });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

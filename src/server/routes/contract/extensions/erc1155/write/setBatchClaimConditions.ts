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
  claimConditionsForToken: Type.Array(
    Type.Object({
      tokenId: Type.Union([Type.String(), Type.Number()], {
        description: "ID of the token to set the claim conditions for",
      }),
      claimConditions: Type.Array(claimConditionInputSchema),
    }),
  ),
  resetClaimEligibilityForAll: Type.Optional(Type.Boolean()),
});

// LOGIC
export async function erc1155SetBatchClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/set-batch",
    schema: {
      summary: "Overwrite the claim conditions for a specific token ID..",
      description:
        "Allows you to set claim conditions for multiple token IDs in a single transaction.",
      tags: ["ERC1155"],
      operationId: "claimConditionsUpdate",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { claimConditionsForToken, resetClaimEligibilityForAll } =
        request.body;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const tx = await contract.erc1155.claimConditions.setBatch.prepare(
        claimConditionsForToken,
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

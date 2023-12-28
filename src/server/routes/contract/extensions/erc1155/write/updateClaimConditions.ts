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
    description: "Token ID to update claim phase for",
  }),
  claimConditionInput: claimConditionInputSchema,
  index: Type.Number({
    description: "Index of the claim condition to update",
  }),
});

// LOGIC
export async function erc1155UpdateClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/update",
    schema: {
      summary: "Update a single claim phase.",
      description:
        "Update a single claim phase on a specific token ID, by providing the index of the claim phase and the new phase configuration.",
      tags: ["ERC1155"],
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
      const { tokenId, claimConditionInput, index } = request.body;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const tx = await contract.erc1155.claimConditions.update.prepare(
        tokenId,
        index,
        claimConditionInput,
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

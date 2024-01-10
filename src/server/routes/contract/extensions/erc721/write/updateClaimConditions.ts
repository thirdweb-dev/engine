import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  claimConditionInputSchema,
  sanitizedClaimConditionInputSchema,
} from "../../../../../schemas/claimConditions";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";
import { isUnixEpochTimestamp } from "../../../../../utils/validator";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  claimConditionInput: claimConditionInputSchema,
  index: Type.Number({
    description: "Index of the claim condition to update",
  }),
});

// LOGIC
export async function erc721UpdateClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/claim-conditions/update",
    schema: {
      summary: "Update a single claim phase.",
      description:
        "Update a single claim phase, by providing the index of the claim phase and the new phase configuration. The index is the position of the phase in the list of phases you have made, starting from zero. e.g. if you have two phases, the first phase has an index of 0 and the second phase has an index of 1. All properties of a phase are optional, with the default being a free, open, unlimited claim, in the native currency, starting immediately.",
      tags: ["ERC721"],
      operationId: "updateClaimConditions",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { claimConditionInput, index } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      // Since Swagger doesn't allow for Date objects, we need to convert the
      // startTime property to a Date object before passing it to the contract.
      const sanitizedClaimConditionInput: Static<
        typeof sanitizedClaimConditionInputSchema
      > = {
        ...claimConditionInput,
        startTime: claimConditionInput.startTime
          ? isUnixEpochTimestamp(
              parseInt(claimConditionInput.startTime.toString()),
            )
            ? new Date(
                parseInt(claimConditionInput.startTime.toString()) * 1000,
              )
            : new Date(claimConditionInput.startTime)
          : undefined,
      };

      const tx = await contract.erc721.claimConditions.update.prepare(
        index,
        sanitizedClaimConditionInput,
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

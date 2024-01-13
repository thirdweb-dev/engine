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
  requestParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";
import { isUnixEpochTimestamp } from "../../../../../utils/validator";

// INPUT
const requestSchema = requestParamSchema;
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
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
      const { claimConditionInputs, resetClaimEligibilityForAll } =
        request.body;
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
      const sanitizedClaimConditionInputs: Static<
        typeof sanitizedClaimConditionInputSchema
      >[] = claimConditionInputs.map((item) => {
        return {
          ...item,
          startTime: item.startTime
            ? isUnixEpochTimestamp(parseInt(item.startTime.toString()))
              ? new Date(parseInt(item.startTime.toString()) * 1000)
              : new Date(item.startTime)
            : undefined,
        };
      });

      const tx = await contract.erc721.claimConditions.set.prepare(
        sanitizedClaimConditionInputs,
        resetClaimEligibilityForAll,
      );
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "erc721",
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

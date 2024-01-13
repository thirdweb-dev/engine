import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  claimConditionInputSchema,
  setBatchSantiziedClaimConditionsRequestSchema,
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
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
      const { claimConditionsForToken, resetClaimEligibilityForAll } =
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
        typeof setBatchSantiziedClaimConditionsRequestSchema
      > = {
        claimConditionsForToken: claimConditionsForToken.map((item) => {
          return {
            tokenId: item.tokenId,
            claimConditions: item.claimConditions.map((condition) => {
              return {
                ...condition,
                startTime: condition.startTime
                  ? isUnixEpochTimestamp(
                      parseInt(condition.startTime.toString()),
                    )
                    ? new Date(parseInt(condition.startTime.toString()) * 1000)
                    : new Date(condition.startTime)
                  : undefined,
              };
            }),
          };
        }),
        resetClaimEligibilityForAll,
      };

      const tx = await contract.erc1155.claimConditions.setBatch.prepare(
        sanitizedClaimConditionInputs.claimConditionsForToken,
        resetClaimEligibilityForAll,
      );
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "erc1155",
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

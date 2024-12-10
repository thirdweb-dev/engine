import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../shared/db/transactions/queueTx";
import { getContract } from "../../../../../../shared/utils/cache/getContract";
import {
  claimConditionInputSchema,
  type setBatchSantiziedClaimConditionsRequestSchema,
} from "../../../../../schemas/claimConditions";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";
import { isUnixEpochTimestamp } from "../../../../../utils/validator";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  claimConditionsForToken: Type.Array(
    Type.Object({
      tokenId: Type.Union([Type.String(), Type.Integer()], {
        description: "ID of the token to set the claim conditions for",
      }),
      claimConditions: Type.Array(claimConditionInputSchema),
    }),
  ),
  resetClaimEligibilityForAll: Type.Optional(Type.Boolean()),
  ...txOverridesWithValueSchema.properties,
});

// LOGIC
export async function erc1155SetBatchClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/set-batch",
    schema: {
      summary: "Overwrite the claim conditions for a specific token ID..",
      description:
        "Allows you to set claim conditions for multiple token IDs in a single transaction.",
      tags: ["ERC1155"],
      operationId: "erc1155-claimConditionsUpdate",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const {
        claimConditionsForToken,
        resetClaimEligibilityForAll,
        txOverrides,
      } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

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
                      Number.parseInt(condition.startTime.toString()),
                    )
                    ? new Date(
                        Number.parseInt(condition.startTime.toString()) * 1000,
                      )
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
        idempotencyKey,
        txOverrides,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

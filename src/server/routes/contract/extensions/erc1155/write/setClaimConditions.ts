import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../shared/db/transactions/queueTx";
import { getContract } from "../../../../../../shared/utils/cache/getContract";
import {
  claimConditionInputSchema,
  type sanitizedClaimConditionInputSchema,
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
  tokenId: Type.Union([Type.String(), Type.Integer()], {
    description: "ID of the token to set the claim conditions for",
  }),
  claimConditionInputs: Type.Array(claimConditionInputSchema),
  resetClaimEligibilityForAll: Type.Optional(Type.Boolean()),
  ...txOverridesWithValueSchema.properties,
});

// LOGIC
export async function erc1155SetClaimCondition(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/set",
    schema: {
      summary: "Overwrite the claim conditions for a specific token ID..",
      description:
        "Overwrite the claim conditions for a specific token ID. All properties of a phase are optional, with the default being a free, open, unlimited claim, in the native currency, starting immediately.",
      tags: ["ERC1155"],
      operationId: "erc1155-setClaimConditions",
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
        tokenId,
        claimConditionInputs,
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
        typeof sanitizedClaimConditionInputSchema
      >[] = claimConditionInputs.map((item) => {
        return {
          ...item,
          startTime: item.startTime
            ? isUnixEpochTimestamp(Number.parseInt(item.startTime.toString()))
              ? new Date(Number.parseInt(item.startTime.toString()) * 1000)
              : new Date(item.startTime)
            : undefined,
        };
      });

      const tx = await contract.erc1155.claimConditions.set.prepare(
        tokenId,
        sanitizedClaimConditionInputs,
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

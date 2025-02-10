import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../shared/db/transactions/queue-tx.js";
import { getContract } from "../../../../../../shared/utils/cache/get-contract.js";
import {
  claimConditionInputSchema,
  type sanitizedClaimConditionInputSchema,
} from "../../../../../schemas/claim-conditions/index.js";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/shared-api-schemas.js";
import { txOverridesWithValueSchema } from "../../../../../schemas/tx-overrides.js";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../../../../utils/chain.js";
import { isUnixEpochTimestamp } from "../../../../../utils/validator.js";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  tokenId: Type.Union([Type.String(), Type.Integer()], {
    description: "Token ID to update claim phase for",
  }),
  claimConditionInput: claimConditionInputSchema,
  index: Type.Integer({
    description: "Index of the claim condition to update",
    minimum: 0,
  }),
  ...txOverridesWithValueSchema.properties,
});

// LOGIC
export async function erc1155UpdateClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/claim-conditions/update",
    schema: {
      summary: "Update a single claim phase.",
      description:
        "Update a single claim phase on a specific token ID, by providing the index of the claim phase and the new phase configuration.",
      tags: ["ERC1155"],
      operationId: "erc1155-updateClaimConditions",
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
      const { tokenId, claimConditionInput, index, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
        "x-transaction-mode": transactionMode,
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
      const sanitizedClaimConditionInput: Static<
        typeof sanitizedClaimConditionInputSchema
      > = {
        ...claimConditionInput,
        startTime: claimConditionInput.startTime
          ? isUnixEpochTimestamp(
              Number.parseInt(claimConditionInput.startTime.toString()),
            )
            ? new Date(
                Number.parseInt(claimConditionInput.startTime.toString()) *
                  1000,
              )
            : new Date(claimConditionInput.startTime)
          : undefined,
      };
      const tx = await contract.erc1155.claimConditions.update.prepare(
        tokenId,
        index,
        sanitizedClaimConditionInput,
      );

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "erc1155",
        idempotencyKey,
        txOverrides,
        transactionMode,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

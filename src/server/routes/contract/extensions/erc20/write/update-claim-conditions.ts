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
  claimConditionInput: claimConditionInputSchema,
  index: Type.Integer({
    description: "Index of the claim condition to update",
    minimum: 0,
  }),
  ...txOverridesWithValueSchema.properties,
});

// LOGIC
export async function erc20UpdateClaimConditions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/claim-conditions/update",
    schema: {
      summary: "Update a single claim phase.",
      description:
        "Update a single claim phase, by providing the index of the claim phase and the new phase configuration. The index is the position of the phase in the list of phases you have made, starting from zero. e.g. if you have two phases, the first phase has an index of 0 and the second phase has an index of 1. All properties of a phase are optional, with the default being a free, open, unlimited claim, in the native currency, starting immediately.",
      tags: ["ERC20"],
      operationId: "erc20-updateClaimConditions",
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
      const { claimConditionInput, index, txOverrides } = request.body;
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
      const tx = await contract.erc20.claimConditions.update.prepare(
        index,
        sanitizedClaimConditionInput,
      );

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "erc20",
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

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
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

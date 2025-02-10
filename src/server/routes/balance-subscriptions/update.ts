import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateBalanceSubscription } from "../../../shared/db/balance-subscriptions/update-balance-subscription";
import { balanceSubscriptionConfigSchema } from "../../../shared/schemas/balance-subscription-config";
import { AddressSchema } from "../../schemas/address";
import { chainIdOrSlugSchema } from "../../schemas/chain";
import {
  balanceSubscriptionSchema,
  toBalanceSubscriptionSchema,
} from "../../schemas/balance-subscription";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../utils/chain";

const requestBodySchema = Type.Object({
  balanceSubscriptionId: Type.String({
    description: "The ID of the balance subscription to update.",
  }),
  chain: Type.Optional(chainIdOrSlugSchema),
  tokenAddress: Type.Optional(Type.Union([AddressSchema, Type.Null()])),
  walletAddress: Type.Optional(AddressSchema),
  config: Type.Optional(balanceSubscriptionConfigSchema),
  webhookId: Type.Optional(
    Type.Union([
      Type.Integer({
        description: "The ID of an existing webhook to use.",
      }),
      Type.Null(),
    ]),
  ),
});

const responseSchema = Type.Object({
  result: balanceSubscriptionSchema,
});

export async function updateBalanceSubscriptionRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/balance-subscriptions/update",
    schema: {
      summary: "Update balance subscription",
      description: "Update an existing balance subscription.",
      tags: ["Balance-Subscriptions"],
      operationId: "updateBalanceSubscription",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const {
        balanceSubscriptionId,
        chain,
        tokenAddress,
        walletAddress,
        config,
        webhookId,
      } = request.body;

      // Get chainId if chain is provided
      const chainId = chain ? await getChainIdFromChain(chain) : undefined;

      // Update the subscription
      const balanceSubscription = await updateBalanceSubscription({
        id: balanceSubscriptionId,
        chainId: chainId?.toString(),
        tokenAddress,
        walletAddress,
        config,
        webhookId,
      });

      reply.status(StatusCodes.OK).send({
        result: toBalanceSubscriptionSchema(balanceSubscription),
      });
    },
  });
}

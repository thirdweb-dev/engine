import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateWalletSubscription } from "../../../shared/db/wallet-subscriptions/update-wallet-subscription";
import { WalletConditionsSchema } from "../../../shared/schemas/wallet-subscription-conditions";
import { AddressSchema } from "../../schemas/address";
import { chainIdOrSlugSchema } from "../../schemas/chain";
import {
  walletSubscriptionSchema,
  toWalletSubscriptionSchema,
} from "../../schemas/wallet-subscription";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../utils/chain";

const requestBodySchema = Type.Object({
  chain: Type.Optional(chainIdOrSlugSchema),
  walletAddress: Type.Optional(AddressSchema),
  conditions: Type.Optional(WalletConditionsSchema),
  webhookId: Type.Optional(
    Type.Union([
      Type.Integer({
        description: "The ID of an existing webhook to use.",
      }),
      Type.Null(),
    ]),
  ),
});

const paramsSchema = Type.Object({
  subscriptionId: Type.String({
    description: "The ID of the wallet subscription to update.",
  }),
});

const responseSchema = Type.Object({
  result: walletSubscriptionSchema,
});

export async function updateWalletSubscriptionRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
    Params: Static<typeof paramsSchema>;
  }>({
    method: "POST",
    url: "/wallet-subscriptions/:subscriptionId",
    schema: {
      params: paramsSchema,
      summary: "Update wallet subscription",
      description: "Update an existing wallet subscription.",
      tags: ["Wallet-Subscriptions"],
      operationId: "updateWalletSubscription",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { subscriptionId } = request.params;

      const { chain, walletAddress, conditions, webhookId } = request.body;

      // Get chainId if chain is provided
      const chainId = chain ? await getChainIdFromChain(chain) : undefined;

      // Update the subscription
      const subscription = await updateWalletSubscription({
        id: subscriptionId,
        chainId: chainId?.toString(),
        walletAddress,
        conditions,
        webhookId,
      });

      reply.status(StatusCodes.OK).send({
        result: toWalletSubscriptionSchema(subscription),
      });
    },
  });
}

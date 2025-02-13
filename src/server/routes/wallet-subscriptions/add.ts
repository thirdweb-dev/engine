import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createWalletSubscription } from "../../../shared/db/wallet-subscriptions/create-wallet-subscription";
import { insertWebhook } from "../../../shared/db/webhooks/create-webhook";
import { getWebhook } from "../../../shared/db/webhooks/get-webhook";
import { WebhooksEventTypes } from "../../../shared/schemas/webhooks";
import { createCustomError } from "../../middleware/error";
import { AddressSchema } from "../../schemas/address";
import { chainIdOrSlugSchema } from "../../schemas/chain";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../utils/chain";
import { isValidWebhookUrl } from "../../utils/validator";
import {
  walletSubscriptionSchema,
  toWalletSubscriptionSchema,
} from "../../schemas/wallet-subscription";
import { WalletConditionsSchema } from "../../../shared/schemas/wallet-subscription-conditions";

const webhookUrlSchema = Type.Object({
  webhookUrl: Type.String({
    description: "Webhook URL to create a new webhook",
    examples: ["https://example.com/webhook"],
  }),
  webhookLabel: Type.Optional(
    Type.String({
      description: "Optional label for the webhook when creating a new one",
      examples: ["My Wallet Subscription Webhook"],
      minLength: 3,
    }),
  ),
});

const webhookIdSchema = Type.Object({
  webhookId: Type.Integer({
    description: "ID of an existing webhook to use",
  }),
});

const requestBodySchema = Type.Intersect([
  Type.Object({
    chain: chainIdOrSlugSchema,
    walletAddress: AddressSchema,
    conditions: WalletConditionsSchema,
  }),
  Type.Optional(Type.Union([webhookUrlSchema, webhookIdSchema])),
]);

const responseSchema = Type.Object({
  result: walletSubscriptionSchema,
});

export async function addWalletSubscriptionRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/wallet-subscriptions",
    schema: {
      summary: "Add wallet subscription",
      description: "Subscribe to wallet conditions.",
      tags: ["Wallet-Subscriptions"],
      operationId: "addWalletSubscription",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, walletAddress, conditions } = request.body;
      const chainId = await getChainIdFromChain(chain);

      let finalWebhookId: number | undefined;

      if ("webhookUrl" in request.body) {
        const { webhookUrl, webhookLabel } = request.body;

        if (!isValidWebhookUrl(webhookUrl)) {
          throw createCustomError(
            "Invalid webhook URL. Make sure it starts with 'https://'.",
            StatusCodes.BAD_REQUEST,
            "BAD_REQUEST",
          );
        }

        const webhook = await insertWebhook({
          url: webhookUrl,
          name: webhookLabel,
          eventType: WebhooksEventTypes.WALLET_SUBSCRIPTION,
        });

        finalWebhookId = webhook.id;
      } else {
        const { webhookId } = request.body;
        const webhook = await getWebhook(webhookId);

        if (!webhook || webhook.revokedAt) {
          throw createCustomError(
            "Invalid webhook ID or webhook has been revoked.",
            StatusCodes.BAD_REQUEST,
            "BAD_REQUEST",
          );
        }

        finalWebhookId = webhookId;
      }

      const subscription = await createWalletSubscription({
        chainId: chainId.toString(),
        walletAddress,
        conditions,
        webhookId: finalWebhookId,
      });

      reply.status(StatusCodes.OK).send({
        result: toWalletSubscriptionSchema(subscription),
      });
    },
  });
}

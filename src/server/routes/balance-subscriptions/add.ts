import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createBalanceSubscription } from "../../../shared/db/balance-subscriptions/create-balance-subscription";
import { insertWebhook } from "../../../shared/db/webhooks/create-webhook";
import { getWebhook } from "../../../shared/db/webhooks/get-webhook";
import { balanceSubscriptionConfigSchema } from "../../../shared/schemas/balance-subscription-config";
import { WebhooksEventTypes } from "../../../shared/schemas/webhooks";
import { createCustomError } from "../../middleware/error";
import { AddressSchema } from "../../schemas/address";
import { chainIdOrSlugSchema } from "../../schemas/chain";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../utils/chain";
import { isValidWebhookUrl } from "../../utils/validator";
import { balanceSubscriptionSchema, toBalanceSubscriptionSchema } from "../../schemas/balance-subscription";

const webhookUrlSchema = Type.Object({
  webhookUrl: Type.String({
    description: "Webhook URL to create a new webhook",
    examples: ["https://example.com/webhook"],
  }),
  webhookLabel: Type.Optional(
    Type.String({
      description: "Optional label for the webhook when creating a new one",
      examples: ["My Balance Subscription Webhook"],
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
    contractAddress: Type.Optional(AddressSchema),
    walletAddress: AddressSchema,
    config: balanceSubscriptionConfigSchema,
  }),
  Type.Union([webhookUrlSchema, webhookIdSchema]),
]);

const responseSchema = Type.Object({
  result: balanceSubscriptionSchema,
});

export async function addBalanceSubscriptionRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/balance-subscriptions/add",
    schema: {
      summary: "Add balance subscription",
      description: "Subscribe to balance changes for a wallet.",
      tags: ["Balance-Subscriptions"],
      operationId: "addBalanceSubscription",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, walletAddress, config } = request.body;
      const chainId = await getChainIdFromChain(chain);

      let finalWebhookId: number | undefined;

      // Handle webhook creation or validation
      if ("webhookUrl" in request.body) {
        // Create new webhook
        const { webhookUrl, webhookLabel } = request.body;
        if (!isValidWebhookUrl(webhookUrl)) {
          throw createCustomError(
            "Invalid webhook URL. Make sure it starts with 'https://'.",
            StatusCodes.BAD_REQUEST,
            "BAD_REQUEST",
          );
        }

        const webhook = await insertWebhook({
          eventType: WebhooksEventTypes.BALANCE_SUBSCRIPTION,
          name: webhookLabel || "(Auto-generated)",
          url: webhookUrl,
        });
        finalWebhookId = webhook.id;
      } else {
        // Validate existing webhook
        const { webhookId } = request.body;
        const webhook = await getWebhook(webhookId);
        if (!webhook) {
          throw createCustomError(
            `Webhook with ID ${webhookId} not found.`,
            StatusCodes.NOT_FOUND,
            "NOT_FOUND",
          );
        }
        if (webhook.eventType !== WebhooksEventTypes.BALANCE_SUBSCRIPTION) {
          throw createCustomError(
            `Webhook with ID ${webhookId} has incorrect event type. Expected '${WebhooksEventTypes.BALANCE_SUBSCRIPTION}' but got '${webhook.eventType}'.`,
            StatusCodes.BAD_REQUEST,
            "BAD_REQUEST",
          );
        }
        if (webhook.revokedAt) {
          throw createCustomError(
            `Webhook with ID ${webhookId} has been revoked.`,
            StatusCodes.BAD_REQUEST,
            "BAD_REQUEST",
          );
        }
        finalWebhookId = webhookId;
      }

      // Create the balance subscription
      const balanceSubscription = await createBalanceSubscription({
        chainId: chainId.toString(),
        contractAddress: contractAddress?.toLowerCase(),
        walletAddress: walletAddress.toLowerCase(),
        config,
        webhookId: finalWebhookId,
      });

      reply.status(StatusCodes.OK).send({
        result: toBalanceSubscriptionSchema(balanceSubscription),
      });
    },
  });
} 
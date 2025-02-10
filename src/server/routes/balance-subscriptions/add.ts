import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createBalanceSubscription } from "../../../shared/db/balance-subscriptions/create-balance-subscription";
import { insertWebhook } from "../../../shared/db/webhooks/create-webhook";
import { balanceSubscriptionConfigSchema } from "../../../shared/schemas/balance-subscription-config";
import { WebhooksEventTypes } from "../../../shared/schemas/webhooks";
import { createCustomError } from "../../middleware/error";
import { AddressSchema } from "../../schemas/address";
import { chainIdOrSlugSchema } from "../../schemas/chain";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { getChainIdFromChain } from "../../utils/chain";
import { isValidWebhookUrl } from "../../utils/validator";
import { balanceSubscriptionSchema, toBalanceSubscriptionSchema } from "../../schemas/balance-subscription";

const requestBodySchema = Type.Object({
  chain: chainIdOrSlugSchema,
  contractAddress: Type.Optional(AddressSchema),
  walletAddress: AddressSchema,
  config: balanceSubscriptionConfigSchema,
  webhookUrl: Type.Optional(
    Type.String({
      description: "Webhook URL",
      examples: ["https://example.com/webhook"],
    }),
  ),
});

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
      const { chain, contractAddress, walletAddress, config, webhookUrl } = request.body;

      const chainId = await getChainIdFromChain(chain);

      // Create the webhook (if provided).
      let webhookId: number | undefined;
      if (webhookUrl) {
        if (!isValidWebhookUrl(webhookUrl)) {
          throw createCustomError(
            "Invalid webhook URL. Make sure it starts with 'https://'.",
            StatusCodes.BAD_REQUEST,
            "BAD_REQUEST",
          );
        }

        const webhook = await insertWebhook({
          eventType: WebhooksEventTypes.BALANCE_SUBSCRIPTION,
          name: "(Auto-generated)",
          url: webhookUrl,
        });
        webhookId = webhook.id;
      }

      // Create the balance subscription.
      const balanceSubscription = await createBalanceSubscription({
        chainId: chainId.toString(),
        contractAddress: contractAddress?.toLowerCase(),
        walletAddress: walletAddress.toLowerCase(),
        config,
        webhookId,
      });

      reply.status(StatusCodes.OK).send({
        result: toBalanceSubscriptionSchema(balanceSubscription),
      });
    },
  });
} 
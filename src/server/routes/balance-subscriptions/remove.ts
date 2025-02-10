import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteBalanceSubscription } from "../../../shared/db/balance-subscriptions/delete-balance-subscription";
import { deleteWebhook } from "../../../shared/db/webhooks/revoke-webhook";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";

const requestBodySchema = Type.Object({
  balanceSubscriptionId: Type.String({
    description: "The ID for an existing balance subscription.",
  }),
});

const responseSchema = Type.Object({
  result: Type.Object({
    status: Type.String(),
  }),
});

export async function removeBalanceSubscriptionRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/balance-subscriptions/remove",
    schema: {
      summary: "Remove balance subscription",
      description: "Remove an existing balance subscription",
      tags: ["Balance-Subscriptions"],
      operationId: "removeBalanceSubscription",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { balanceSubscriptionId } = request.body;

      const balanceSubscription = await deleteBalanceSubscription(balanceSubscriptionId);
      if (balanceSubscription.webhookId) {
        await deleteWebhook(balanceSubscription.webhookId);
      }

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
} 
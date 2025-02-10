import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllBalanceSubscriptions } from "../../../shared/db/balance-subscriptions/get-all-balance-subscriptions";
import { balanceSubscriptionSchema, toBalanceSubscriptionSchema } from "../../schemas/balance-subscription";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";

const responseSchema = Type.Object({
  result: Type.Array(balanceSubscriptionSchema),
});

export async function getAllBalanceSubscriptionsRoute(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/balance-subscriptions/get-all",
    schema: {
      summary: "Get balance subscriptions",
      description: "Get all balance subscriptions.",
      tags: ["Balance-Subscriptions"],
      operationId: "getAllBalanceSubscriptions",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (_request, reply) => {
      const balanceSubscriptions = await getAllBalanceSubscriptions();

      reply.status(StatusCodes.OK).send({
        result: balanceSubscriptions.map(toBalanceSubscriptionSchema),
      });
    },
  });
} 
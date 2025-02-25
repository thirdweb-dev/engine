import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteWalletSubscription } from "../../../shared/db/wallet-subscriptions/delete-wallet-subscription";
import {
  walletSubscriptionSchema,
  toWalletSubscriptionSchema,
} from "../../schemas/wallet-subscription";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";

const responseSchema = Type.Object({
  result: walletSubscriptionSchema,
});

const paramsSchema = Type.Object({
  subscriptionId: Type.String({
    description: "The ID of the wallet subscription to update.",
  }),
});


export async function deleteWalletSubscriptionRoute(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Params: Static<typeof paramsSchema>;
  }>({
    method: "DELETE",
    url: "/wallet-subscriptions/:subscriptionId",
    schema: {
      summary: "Delete wallet subscription",
      description: "Delete an existing wallet subscription.",
      tags: ["Wallet-Subscriptions"],
      operationId: "deleteWalletSubscription",
      params: paramsSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { subscriptionId } = request.params;

      const subscription = await deleteWalletSubscription(subscriptionId);

      reply.status(StatusCodes.OK).send({
        result: toWalletSubscriptionSchema(subscription),
      });
    },
  });
}

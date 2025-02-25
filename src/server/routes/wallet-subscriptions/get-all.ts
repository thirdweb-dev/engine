import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllWalletSubscriptions } from "../../../shared/db/wallet-subscriptions/get-all-wallet-subscriptions";
import {
  walletSubscriptionSchema,
  toWalletSubscriptionSchema,
} from "../../schemas/wallet-subscription";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { PaginationSchema } from "../../schemas/pagination";

const responseSchema = Type.Object({
  result: Type.Array(walletSubscriptionSchema),
});

export async function getAllWalletSubscriptionsRoute(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Params: Static<typeof PaginationSchema>;
  }>({
    method: "GET",
    url: "/wallet-subscriptions/get-all",
    schema: {
      params: PaginationSchema,
      summary: "Get wallet subscriptions",
      description: "Get all wallet subscriptions.",
      tags: ["Wallet-Subscriptions"],
      operationId: "getAllWalletSubscriptions",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { page, limit } = request.params;

      const subscriptions = await getAllWalletSubscriptions({
        page,
        limit,
      });

      reply.status(StatusCodes.OK).send({
        result: subscriptions.map(toWalletSubscriptionSchema),
      });
    },
  });
}

import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteContractSubscription } from "../../../../shared/db/contract-subscriptions/delete-contract-subscription";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

const bodySchema = Type.Object({
  contractSubscriptionId: Type.String({
    description: "The ID for an existing contract subscription.",
  }),
});

const responseSchema = Type.Object({
  result: Type.Object({
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    status: "success",
  },
};

export async function removeContractSubscription(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof bodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/contract-subscriptions/remove",
    schema: {
      summary: "Remove contract subscription",
      description: "Remove an existing contract subscription",
      tags: ["Contract-Subscriptions"],
      operationId: "removeContractSubscription",
      body: bodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { contractSubscriptionId } = request.body;

      const contractSubscription = await deleteContractSubscription(
        contractSubscriptionId,
      );

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
}

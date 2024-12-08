import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WebhooksEventTypes } from "../../../shared/schemas/webhooks";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

export const responseBodySchema = Type.Object({
  result: Type.Array(Type.Enum(WebhooksEventTypes)),
});

export async function getWebhooksEventTypes(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/webhooks/event-types",
    schema: {
      summary: "Get webhooks event types",
      description: "Get the all the webhooks event types",
      tags: ["Webhooks"],
      operationId: "getEventTypes",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const eventTypesArray = Object.values(WebhooksEventTypes);
      res.status(StatusCodes.OK).send({
        result: eventTypesArray,
      });
    },
  });
}

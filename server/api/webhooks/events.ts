import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WebhooksEventTypes } from "../../../src/schema/webhooks";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";

export const ReplySchema = Type.Object({
  result: Type.Array(Type.Enum(WebhooksEventTypes)),
});

export async function getWebhooksEventTypes(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
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
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const eventTypesArray = Object.values(WebhooksEventTypes);
      res.status(200).send({
        result: eventTypesArray,
      });
    },
  });
}

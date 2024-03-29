import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllWebhooks } from "../../../db/webhooks/getAllWebhooks";
import {
  WebhookResponseSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";

const ReplySchema = Type.Object({
  result: Type.Array(WebhookResponseSchema),
});

export async function getAllWebhooksData(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/webhooks/get-all",
    schema: {
      summary: "Get all webhooks configured",
      description: "Get all webhooks configuration data set up on Engine",
      tags: ["Webhooks"],
      operationId: "getAll",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const allWebhooks = await getAllWebhooks();
      const result = allWebhooks.map((webhook) => ({
        url: webhook.url,
        name: webhook.name,
        secret: webhook.secret,
        eventType: webhook.eventType,
        active: !webhook.revokedAt,
        createdAt: webhook.createdAt.toISOString(),
        id: webhook.id.toString(),
      }));

      res.status(200).send({
        result,
      });
    },
  });
}

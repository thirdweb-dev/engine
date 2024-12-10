import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertWebhook } from "../../../shared/db/webhooks/create-webhook";
import { WebhooksEventTypes } from "../../../shared/schemas/webhooks";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { WebhookSchema, toWebhookSchema } from "../../schemas/webhook";
import { isValidWebhookUrl } from "../../utils/validator";

const requestBodySchema = Type.Object({
  url: Type.String({
    description: "Webhook URL. Non-HTTPS URLs are not supported.",
    examples: ["https://example.com/webhook"],
  }),
  name: Type.Optional(
    Type.String({
      minLength: 3,
    }),
  ),
  eventType: Type.Enum(WebhooksEventTypes),
});

requestBodySchema.examples = [
  {
    url: "https://example.com/webhook",
    name: "Notify of transaction updates",
    secret: "...",
    eventType: WebhooksEventTypes.ALL_TX,
    active: true,
    createdAt: "2024-10-02T02:07:27.255Z",
    id: 42,
  },
];

const responseBodySchema = Type.Object({
  result: WebhookSchema,
});

export async function createWebhookRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/webhooks/create",
    schema: {
      summary: "Create a webhook",
      description:
        "Create a webhook to call when a specific Engine event occurs.",
      tags: ["Webhooks"],
      operationId: "createWebhook",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { url, name, eventType } = req.body;

      if (!isValidWebhookUrl(url)) {
        throw createCustomError(
          "Invalid webhook URL. Make sure it starts with 'https://'.",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      const webhook = await insertWebhook({
        url,
        name,
        eventType,
      });

      res.status(StatusCodes.OK).send({
        result: toWebhookSchema(webhook),
      });
    },
  });
}

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertWebhook } from "../../../db/webhooks/createWebhook";
import { WebhooksEventTypes } from "../../../schema/webhooks";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { WebhookSchema, toWebhookSchema } from "../../schemas/webhook";
import { isValidWebhookUrl } from "../../utils/validator";

const requestBodySchema = Type.Object({
  url: Type.String({
    description: "Webhook URL. Non-HTTPS URLs are not supported.",
    examples: ["https://example.com/webhook"],
  }),
  name: Type.Optional(Type.String()),
  eventType: Type.Enum(WebhooksEventTypes),
  mtlsClientCert: Type.Optional(
    Type.String({
      description:
        "(For mTLS) The client certificate used to authenticate your to your server.",
    }),
  ),
  mtlsClientKey: Type.Optional(
    Type.String({
      description:
        "(For mTLS) The private key associated with your client certificate.",
    }),
  ),
  mtlsCaCert: Type.Optional(
    Type.String({
      description:
        "(For mTLS) The Certificate Authority (CA) that signed your client certificate, used to verify the authenticity of the `mtlsClientCert`. This is only required if using a self-signed certficate.",
    }),
  ),
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
      summary: "Create webhook",
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

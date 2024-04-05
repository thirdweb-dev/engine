import { Static, Type } from "@sinclair/typebox";
import { TypeSystem } from "@sinclair/typebox/system";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertWebhook } from "../../../db/webhooks/insertWebhook";
import { WebhooksEventTypes } from "../../../schema/webhooks";
import { isLocalhost } from "../../../utils/url";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  WebhookResponseSchema,
  toWebhookResponse,
} from "../../schemas/webhooks";

const uriFormat = TypeSystem.Format("uri", (input: string) => {
  // Assert valid URL.
  try {
    new URL(input);
  } catch (err) {
    return false;
  }

  return !isLocalhost(input);
});

const BodySchema = Type.Object({
  url: Type.String({
    description: "Webhook URL",
    format: uriFormat,
    examples: ["https://example.com/webhooks"],
  }),
  name: Type.Optional(
    Type.String({
      minLength: 3,
    }),
  ),
  eventType: Type.Enum(WebhooksEventTypes),
});

BodySchema.examples = [
  {
    url: "https://example.com/allTxUpdate",
    name: "All transaction events",
    eventType: WebhooksEventTypes.ALL_TRANSACTIONS,
  },
  {
    url: "https://example.com/walletBalance",
    name: "Backend wallet balance event",
    eventType: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
  },
  {
    url: "https://example.com/auth",
    name: "Authentication",
    eventType: WebhooksEventTypes.AUTH,
  },
];

const ReplySchema = Type.Object({
  result: WebhookResponseSchema,
});

export async function createWebhook(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/webhooks/create",
    schema: {
      summary: "Create a webhook",
      description:
        "Create a webhook to call when certain blockchain events occur.",
      tags: ["Webhooks"],
      operationId: "create",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { url, name, eventType } = req.body;
      const webhook = await insertWebhook({ url, name, eventType });

      res.status(200).send({
        result: toWebhookResponse(webhook),
      });
    },
  });
}

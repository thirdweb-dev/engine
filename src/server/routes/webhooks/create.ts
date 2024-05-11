import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertWebhook } from "../../../db/webhooks/createWebhook";
import { WebhooksEventTypes } from "../../../schema/webhooks";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { WebhookSchema, toWebhookSchema } from "../../schemas/webhook";
import { isValidHttpUrl } from "../../utils/validator";

const BodySchema = Type.Object({
  url: Type.String({
    description: "Webhook URL",
    examples: ["https://example.com/webhook"],
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
    name: "All Transaction Events",
    eventType: WebhooksEventTypes.ALL_TX,
  },
  {
    url: "https://example.com/queuedTx",
    name: "QueuedTx",
    eventType: WebhooksEventTypes.QUEUED_TX,
  },
  {
    url: "https://example.com/sentTx",
    name: "Sent Transaction Event",
    eventType: WebhooksEventTypes.SENT_TX,
  },
  {
    url: "https://example.com/minedTx",
    name: "Mined Transaction Event",
    eventType: WebhooksEventTypes.MINED_TX,
  },
  {
    url: "https://example.com/erroredTx",
    name: "Errored Transaction Event",
    eventType: WebhooksEventTypes.ERRORED_TX,
  },
  {
    url: "https://example.com/cancelledTx",
    name: "Cancelled Transaction Event",
    eventType: WebhooksEventTypes.CANCELLED_TX,
  },
  {
    url: "https://example.com/walletBalance",
    name: "Backend Wallet Balance Event",
    eventType: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
  },
  {
    url: "https://example.com/auth",
    name: "Auth Check",
    eventType: WebhooksEventTypes.AUTH,
  },
];

const ReplySchema = Type.Object({
  result: WebhookSchema,
});

export async function createWebhook(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
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

      if (!isValidHttpUrl(url)) {
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

      res.status(200).send({
        result: toWebhookSchema(webhook),
      });
    },
  });
}

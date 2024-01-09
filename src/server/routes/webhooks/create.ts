import { Static, Type } from "@sinclair/typebox";
import { TypeSystem } from "@sinclair/typebox/system";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertWebhook } from "../../../db/webhooks/createWebhook";
import { WebhooksEventTypes } from "../../../schema/webhooks";
import { isLocalhost } from "../../../utils/url";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

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
    name: "All Transaction Events",
    eventType: WebhooksEventTypes.ALL_TX,
  },
  {
    url: "https://example.com/queuedTx",
    name: "QueuedTx",
    eventType: WebhooksEventTypes.QUEUED_TX,
  },
  {
    url: "https://example.com/retiredTx",
    name: "RetriedTx",
    eventType: WebhooksEventTypes.RETRIED_TX,
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
  result: Type.Object({
    url: Type.String(),
    name: Type.String(),
    createdAt: Type.String(),
    eventType: Type.String(),
    secret: Type.Optional(Type.String()),
    id: Type.Number(),
  }),
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
      const config = await insertWebhook({ ...req.body });
      res.status(200).send({
        result: {
          ...config,
        },
      });
    },
  });
}

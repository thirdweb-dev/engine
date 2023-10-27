import { Static, Type } from "@sinclair/typebox";
import { TypeSystem } from "@sinclair/typebox/system";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertWebhook } from "../../../db/webhooks/createWebhook";
import { WebhooksEventTypes } from "../../../schema/webhooks";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const uriFormat = TypeSystem.Format("uri", (input: string) => {
  try {
    if (input.startsWith("http://localhost")) return true;

    const url = new URL(input);

    if (url.protocol === "http:") {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
});

const BodySchema = Type.Object({
  url: Type.String({
    description: "URL to send the webhook to",
    format: uriFormat,
    examples: [
      "http://localhost:3000/webhooks",
      "https://example.com/webhooks",
    ],
  }),
  name: Type.Optional(
    Type.String({
      minLength: 5,
    }),
  ),
  eventType: Type.Enum(WebhooksEventTypes),
});

BodySchema.examples = [
  {
    url: "http://localhost:3000/allTxUpdate",
    name: "All Transaction Events",
    eventType: WebhooksEventTypes.ALL_TX,
  },
  {
    url: "http://localhost:3000/queuedTx",
    name: "QueuedTx",
    eventType: WebhooksEventTypes.QUEUED_TX,
  },
  {
    url: "http://localhost:3000/retiredTx",
    name: "RetriedTx",
    eventType: WebhooksEventTypes.RETRIED_TX,
  },
  {
    url: "http://localhost:3000/sentTx",
    name: "Sent Transaction Event",
    eventType: WebhooksEventTypes.SENT_TX,
  },
  {
    url: "http://localhost:3000/minedTx",
    name: "Mined Transaction Event",
    eventType: WebhooksEventTypes.MINED_TX,
  },
  {
    url: "http://localhost:3000/erroredTx",
    name: "Errored Transaction Event",
    eventType: WebhooksEventTypes.ERRORED_TX,
  },
  {
    url: "http://localhost:3000/cancelledTx",
    name: "Cancelled Transaction Event",
    eventType: WebhooksEventTypes.CANCELLED_TX,
  },
  {
    url: "http://localhost:3000/walletBalance",
    name: "Backend Wallet Balance Event",
    eventType: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
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
      summary: "Create a new webhook",
      description: "Create a new webhook",
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

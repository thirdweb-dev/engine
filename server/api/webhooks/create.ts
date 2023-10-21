import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertWebhook } from "../../../src/db/webhooks/createWebhook";
import { WebhooksEventTypes } from "../../../src/schema/webhooks";
import { logger } from "../../../src/utils/logger";

const BodySchema = Type.Object({
  url: Type.String(),
  name: Type.String(),
  eventType: Type.Enum(WebhooksEventTypes),
  secret: Type.Optional(
    Type.String({
      minLength: 10,
    }),
  ),
});

BodySchema.examples = [
  {
    url: "http://localhost:3000/allTxUpdate",
    name: "All Transaction Events",
    eventType: WebhooksEventTypes.ALL_TX,
    secret: "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7",
  },
  {
    url: "http://localhost:3000/queuedTx",
    name: "QueuedTx",
    eventType: WebhooksEventTypes.QUEUED_TX,
    secret: "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7",
  },
  {
    url: "http://localhost:3000/retiredTx",
    name: "RetriedTx",
    eventType: WebhooksEventTypes.RETRIED_TX,
    secret: "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7",
  },
  {
    url: "http://localhost:3000/sentTx",
    name: "Sent Transaction Event",
    eventType: WebhooksEventTypes.SENT_TX,
    secret: "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7",
  },
  {
    url: "http://localhost:3000/minedTx",
    name: "Mined Transaction Event",
    eventType: WebhooksEventTypes.MINED_TX,
    secret: "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7",
  },
  {
    url: "http://localhost:3000/erroredTx",
    name: "Errored Transaction Event",
    eventType: WebhooksEventTypes.ERRORED_TX,
    secret: "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7",
  },
  {
    url: "http://localhost:3000/cancelledTx",
    name: "Cancelled Transaction Event",
    eventType: WebhooksEventTypes.CANCELLED_TX,
    secret: "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7",
  },
  {
    url: "http://localhost:3000/walletBalance",
    name: "Backend Wallet Balance Event",
    eventType: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
    secret: "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7",
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
      operationId: "createWebhooks",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await insertWebhook({ ...req.body });
      logger.server.debug("Created new webhook", { config });
      res.status(200).send({
        result: {
          ...config,
          secret: `${config.secret?.slice(4)}...${config.secret?.slice(-4)}`,
        },
      });
    },
  });
}

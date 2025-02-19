import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllWebhooks } from "../../../shared/db/webhooks/get-all-webhooks.js";
import { standardResponseSchema } from "../../schemas/shared-api-schemas.js";
import { WebhookSchema, toWebhookSchema } from "../../schemas/webhook.js";

const responseBodySchema = Type.Object({
  result: Type.Array(WebhookSchema),
});

export async function getAllWebhooksData(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/webhooks/get-all",
    schema: {
      summary: "Get all webhooks configured",
      description: "Get all webhooks configuration data set up on Engine",
      tags: ["Webhooks"],
      operationId: "listWebhooks",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (_req, res) => {
      const webhooks = await getAllWebhooks();

      res.status(StatusCodes.OK).send({
        result: webhooks.map(toWebhookSchema),
      });
    },
  });
}

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getWebhook } from "../../../shared/db/webhooks/get-webhook";
import { deleteWebhook } from "../../../shared/db/webhooks/revoke-webhook";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";

const requestBodySchema = Type.Object({
  id: Type.Integer({ minimum: 0 }),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function revokeWebhook(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/webhooks/revoke",
    schema: {
      summary: "Revoke webhook",
      description: "Revoke a Webhook",
      tags: ["Webhooks"],
      operationId: "revoke",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { id } = req.body;

      const webhook = await getWebhook(id);
      if (!webhook) {
        throw createCustomError(
          "Webhook not found.",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      await deleteWebhook(id);

      res.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}

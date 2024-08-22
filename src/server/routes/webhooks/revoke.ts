import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getWebhook } from "../../../db/webhooks/getWebhook";
import { deleteWebhook } from "../../../db/webhooks/revokeWebhook";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Object({
  id: Type.Number(),
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

      res.status(200).send({
        result: {
          success: true,
        },
      });
    },
  });
}

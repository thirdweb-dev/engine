import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { markWebhookAsRevoked } from "../../../src/db/webhooks/revokeWebhook";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";

const BodySchema = Type.Object({
  id: Type.Number(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function revokeWebhook(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/webhooks/revoke",
    schema: {
      summary: "Revoke webhook",
      description: "Revoke a Webhook",
      tags: ["Webhooks"],
      operationId: "revoke",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { id } = req.body;
      await markWebhookAsRevoked({
        id,
      });
      res.status(200).send({
        result: {
          success: true,
        },
      });
    },
  });
}

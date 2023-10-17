import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../src/db/configuration/updateConfiguration";
import { ReplySchema } from "./get";

const BodySchema = Type.Partial(
  Type.Object({
    webhookUrl: Type.String(),
    webhookAuthBearerToken: Type.String(),
  }),
);

export async function updateWebhookConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/configuration/webhook",
    schema: {
      summary: "Update webhook configuration",
      description: "Update the engine configuration for webhook",
      tags: ["Configuration"],
      operationId: "updateWebhookConfiguration",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await updateConfiguration({ ...req.body });
      res.status(200).send({
        result: {
          webhookUrl: config.webhookUrl,
          webhookAuthBearerToken: config.webhookAuthBearerToken,
        },
      });
    },
  });
}

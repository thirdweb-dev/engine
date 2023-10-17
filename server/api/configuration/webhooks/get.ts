import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfiguration } from "../../../../src/db/configuration/getConfiguration";

export const ReplySchema = Type.Object({
  result: Type.Object({
    webhookUrl: Type.String(),
    webhookAuthBearerToken: Type.String(),
  }),
});

export async function getWebhookConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/configuration/webhook",
    schema: {
      summary: "Get webhook configuration",
      description: "Get the engine configuration for webhook",
      tags: ["Configuration"],
      operationId: "getWebhookConfiguration",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfiguration();
      res.status(200).send({
        result: {
          webhookAuthBearerToken: config.webhookAuthBearerToken || "",
          webhookUrl: config.webhookUrl || "",
        },
      });
    },
  });
}

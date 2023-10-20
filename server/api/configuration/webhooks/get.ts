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

export async function getWebhooksConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/configuration/webhooks",
    schema: {
      summary: "Get webhooks configuration",
      description: "Get the engine configuration for webhooks",
      tags: ["Configuration"],
      operationId: "getWebhooksConfiguration",
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

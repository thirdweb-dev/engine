import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllWebhooks } from "../../../db/webhooks/getAllWebhooks";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const ReplySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      url: Type.String(),
      name: Type.Union([Type.String(), Type.Null()]),
      secret: Type.Optional(Type.String()),
      eventType: Type.String(),
      active: Type.Boolean(),
      createdAt: Type.String(),
      id: Type.Number(),
    }),
  ),
});

export async function getAllWebhooksData(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/webhooks/get-all",
    schema: {
      summary: "Get all webhooks configured",
      description: "Get all webhooks configuration data set up on Engine",
      tags: ["Webhooks"],
      operationId: "getAll",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const webhooksData = await getAllWebhooks();
      res.status(StatusCodes.OK).send({
        result: webhooksData,
      });
    },
  });
}

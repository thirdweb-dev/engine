import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";

export const ReplySchema = Type.Object({
  result: Type.Union([Type.Array(Type.String()), Type.String(), Type.Null()]),
});

export async function getCorsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/configuration/cors",
    schema: {
      summary: "Get CORS configuration",
      description: "Get the engine configuration for CORS",
      tags: ["Configuration"],
      operationId: "getCorsConfiguration",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig(false);

      res.status(200).send({
        result: config.accessControlAllowOrigin.split(","),
      });
    },
  });
}

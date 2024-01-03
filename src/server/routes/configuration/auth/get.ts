import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";

export const ReplySchema = Type.Object({
  result: Type.Object({
    domain: Type.String(),
  }),
});

export async function getAuthConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/configuration/auth",
    schema: {
      summary: "Get auth configuration",
      description: "Get the engine configuration for auth",
      tags: ["Configuration"],
      operationId: "getAuthConfiguration",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(200).send({
        result: {
          domain: config.authDomain,
        },
      });
    },
  });
}

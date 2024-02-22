import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

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
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(StatusCodes.OK).send({
        result: {
          domain: config.authDomain,
        },
      });
    },
  });
}

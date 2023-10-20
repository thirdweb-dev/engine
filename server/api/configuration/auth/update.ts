import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../src/db/configuration/updateConfiguration";
import { ReplySchema } from "./get";

export const BodySchema = Type.Object({
  domain: Type.String(),
});

export async function updateAuthConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
    Body: Static<typeof BodySchema>;
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
      const config = await updateConfiguration({
        authDomain: req.body.domain,
      });

      res.status(200).send({
        result: {
          domain: config.authDomain,
        },
      });
    },
  });
}

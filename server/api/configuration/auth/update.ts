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
    method: "POST",
    url: "/configuration/auth",
    schema: {
      summary: "Update auth configuration",
      description: "Update the engine configuration for auth",
      tags: ["Configuration"],
      operationId: "updateAuthConfiguration",
      body: BodySchema,
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

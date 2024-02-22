import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
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
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      await updateConfiguration({
        authDomain: req.body.domain,
      });

      const config = await getConfig(false);

      res.status(StatusCodes.OK).send({
        result: {
          domain: config.authDomain,
        },
      });
    },
  });
}

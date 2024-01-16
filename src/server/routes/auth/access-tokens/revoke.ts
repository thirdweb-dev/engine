import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { revokeToken } from "../../../../db/tokens/revokeToken";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const BodySchema = Type.Object({
  id: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function revokeAccessToken(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/auth/access-tokens/revoke",
    schema: {
      summary: "Revoke an access token",
      description: "Revoke an access token",
      tags: ["Access Tokens"],
      operationId: "revoke",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      await revokeToken({ id: req.body.id });

      res.status(200).send({
        result: {
          success: true,
        },
      });
    },
  });
}

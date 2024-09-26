import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { revokeToken } from "../../../../db/tokens/revokeToken";
import { accessTokenCache } from "../../../../utils/cache/accessToken";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Object({
  id: Type.String(),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function revokeAccessToken(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/auth/access-tokens/revoke",
    schema: {
      summary: "Revoke an access token",
      description: "Revoke an access token",
      tags: ["Access Tokens"],
      operationId: "revoke",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      await revokeToken({ id: req.body.id });

      accessTokenCache.clear();

      res.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}

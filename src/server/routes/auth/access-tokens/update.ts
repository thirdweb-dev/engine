import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateToken } from "../../../../db/tokens/updateToken";
import { accessTokenCache } from "../../../../utils/cache/accessToken";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Object({
  id: Type.String(),
  label: Type.Optional(Type.String()),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function updateAccessToken(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/auth/access-tokens/update",
    schema: {
      summary: "Update an access token",
      description: "Update an access token",
      tags: ["Access Tokens"],
      operationId: "updateAccessTokens",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { id, label } = req.body;
      await updateToken({ id, label });

      accessTokenCache.clear();

      res.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}

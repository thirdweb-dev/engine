import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAccessTokens } from "../../../../src/db/tokens/getAccessTokens";

export const AccessTokenSchema = Type.Object({
  id: Type.String(),
  tokenMask: Type.String(),
  walletAddress: Type.String(),
  createdAt: Type.Date(),
  expiresAt: Type.Date(),
});

const ReplySchema = Type.Object({
  result: Type.Array(AccessTokenSchema),
});

export async function getAllAccessTokens(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/auth/access-tokens/get-all",
    schema: {
      summary: "Get all access tokens",
      description: "Get all access tokens",
      tags: ["Access Tokens"],
      operationId: "getAllAccessTokens",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const accessTokens = await getAccessTokens();
      res.status(200).send({
        result: accessTokens,
      });
    },
  });
}

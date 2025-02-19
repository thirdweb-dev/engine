import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAccessTokens } from "../../../../shared/db/tokens/get-access-tokens.js";
import { AddressSchema } from "../../../schemas/address.js";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas.js";

export const AccessTokenSchema = Type.Object({
  id: Type.String(),
  tokenMask: Type.String(),
  walletAddress: AddressSchema,
  createdAt: Type.String(),
  expiresAt: Type.String(),
  label: Type.Union([Type.String(), Type.Null()]),
});

const responseBodySchema = Type.Object({
  result: Type.Array(AccessTokenSchema),
});

export async function getAllAccessTokens(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/auth/access-tokens/get-all",
    schema: {
      summary: "Get all access tokens",
      description: "Get all access tokens",
      tags: ["Access Tokens"],
      operationId: "listAccessTokens",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (_req, res) => {
      const accessTokens = await getAccessTokens();
      res.status(StatusCodes.OK).send({
        result: accessTokens.map((token) => ({
          ...token,
          createdAt: token.createdAt.toISOString(),
          expiresAt: token.expiresAt.toISOString(),
        })),
      });
    },
  });
}

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllWalletCredentials } from "../../../shared/db/wallet-credentials/get-all-wallet-credentials";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { PaginationSchema } from "../../schemas/pagination";

const QuerySchema = PaginationSchema;

const responseSchema = Type.Object({
  result: Type.Array(
    Type.Object({
      id: Type.String(),
      type: Type.String(),
      label: Type.Union([Type.String(), Type.Null()]),
      isDefault: Type.Union([Type.Boolean(), Type.Null()]),
      createdAt: Type.String(),
      updatedAt: Type.String(),
    }),
  ),
});

responseSchema.example = {
  result: [
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      type: "circle",
      label: "My Circle Credential",
      isDefault: false,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      deletedAt: null,
    },
  ],
};

export async function getAllWalletCredentialsRoute(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof QuerySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/wallet-credentials",
    schema: {
      summary: "Get all wallet credentials",
      description: "Get all wallet credentials with pagination.",
      tags: ["Wallet Credentials"],
      operationId: "getAllWalletCredentials",
      querystring: QuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      const credentials = await getAllWalletCredentials({
        page: req.query.page,
        limit: req.query.limit,
      });

      res.status(StatusCodes.OK).send({
        result: credentials.map((cred) => ({
          ...cred,
          createdAt: cred.createdAt.toISOString(),
          updatedAt: cred.updatedAt.toISOString(),
        })),
      });
    },
  });
}

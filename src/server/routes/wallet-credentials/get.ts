import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  getWalletCredential,
  WalletCredentialsError,
} from "../../../shared/db/wallet-credentials/get-wallet-credential";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";

const ParamsSchema = Type.Object({
  id: Type.String({
    description: "The ID of the wallet credential to get.",
  }),
});

const responseSchema = Type.Object({
  result: Type.Object({
    id: Type.String(),
    type: Type.String(),
    label: Type.Union([Type.String(), Type.Null()]),
    isDefault: Type.Union([Type.Boolean(), Type.Null()]),
    createdAt: Type.String(),
    updatedAt: Type.String(),
    deletedAt: Type.Union([Type.String(), Type.Null()]),
  }),
});

responseSchema.example = {
  result: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    type: "circle",
    label: "My Circle Credential",
    isDefault: false,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    deletedAt: null,
  },
};

export async function getWalletCredentialRoute(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/wallet-credentials/:id",
    schema: {
      summary: "Get wallet credential",
      description: "Get a wallet credential by ID.",
      tags: ["Wallet Credentials"],
      operationId: "getWalletCredential",
      params: ParamsSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      try {
        const credential = await getWalletCredential({
          id: req.params.id,
        });

        reply.status(StatusCodes.OK).send({
          result: {
            id: credential.id,
            type: credential.type,
            label: credential.label,
            isDefault: credential.isDefault,
            createdAt: credential.createdAt.toISOString(),
            updatedAt: credential.updatedAt.toISOString(),
            deletedAt: credential.deletedAt?.toISOString() || null,
          },
        });
      } catch (e) {
        if (e instanceof WalletCredentialsError) {
          throw createCustomError(
            e.message,
            StatusCodes.NOT_FOUND,
            "WALLET_CREDENTIAL_NOT_FOUND",
          );
        }
        throw e;
      }
    },
  });
}

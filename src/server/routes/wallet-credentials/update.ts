import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateWalletCredential } from "../../../shared/db/wallet-credentials/update-wallet-credential.js";
import { WalletCredentialsError } from "../../../shared/db/wallet-credentials/get-wallet-credential.js";
import { createCustomError } from "../../middleware/error.js";
import { standardResponseSchema } from "../../schemas/shared-api-schemas.js";

const ParamsSchema = Type.Object({
  id: Type.String({
    description: "The ID of the wallet credential to update.",
  }),
});

const requestBodySchema = Type.Object({
  label: Type.Optional(Type.String()),
  isDefault: Type.Optional(
    Type.Boolean({
      description:
        "Whether this credential should be set as the default for its type. Only one credential can be default per type.",
    }),
  ),
  entitySecret: Type.Optional(
    Type.String({
      description:
        "32-byte hex string. Consult https://developers.circle.com/w3s/entity-secret-management to create and register an entity secret.",
      pattern: "^[0-9a-fA-F]{64}$",
    }),
  ),
});

const responseSchema = Type.Object({
  result: Type.Object({
    id: Type.String(),
    type: Type.String(),
    label: Type.Union([Type.String(), Type.Null()]),
    isDefault: Type.Union([Type.Boolean(), Type.Null()]),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    type: "circle",
    label: "My Updated Circle Credential",
    isDefault: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
};

export async function updateWalletCredentialRoute(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "PUT",
    url: "/wallet-credentials/:id",
    schema: {
      summary: "Update wallet credential",
      description:
        "Update a wallet credential's label, default status, and entity secret.",
      tags: ["Wallet Credentials"],
      operationId: "updateWalletCredential",
      params: ParamsSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      try {
        const credential = await updateWalletCredential({
          id: req.params.id,
          label: req.body.label,
          isDefault: req.body.isDefault,
          entitySecret: req.body.entitySecret,
        });

        reply.status(StatusCodes.OK).send({
          result: {
            id: credential.id,
            type: credential.type,
            label: credential.label,
            isDefault: credential.isDefault,
            createdAt: credential.createdAt.toISOString(),
            updatedAt: credential.updatedAt.toISOString(),
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

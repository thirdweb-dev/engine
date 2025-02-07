import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createWalletCredential } from "../../../shared/db/wallet-credentials/create-wallet-credential";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { type Static, Type } from "@sinclair/typebox";
import { WalletCredentialsError } from "../../../shared/db/wallet-credentials/get-wallet-credential";
import { createCustomError } from "../../middleware/error";

const requestBodySchema = Type.Object({
  label: Type.String(),
  type: Type.Literal("circle"),
  entitySecret: Type.Optional(
    Type.String({
      description:
        "32-byte hex string. If not provided, a random one will be generated.",
      pattern: "^[0-9a-fA-F]{64}$",
    }),
  ),
  isDefault: Type.Optional(
    Type.Boolean({
      description:
        "Whether this credential should be set as the default for its type. Only one credential can be default per type.",
      default: false,
    }),
  ),
});

const responseSchema = Type.Object({
  result: Type.Object({
    id: Type.String(),
    type: Type.String(),
    label: Type.String(),
    isDefault: Type.Union([Type.Boolean(), Type.Null()]),
    createdAt: Type.String(),
    updatedAt: Type.String(),
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
  },
};

export const createWalletCredentialRoute = async (fastify: FastifyInstance) => {
  fastify.withTypeProvider().route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/wallet-credentials",
    schema: {
      summary: "Create wallet credentials",
      description: "Create a new set of wallet credentials.",
      tags: ["Wallet Credentials"],
      operationId: "createWalletCredential",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { label, type, entitySecret, isDefault } = req.body;

      let createdWalletCredential: Awaited<
        ReturnType<typeof createWalletCredential>
      > | null = null;

      try {
        createdWalletCredential = await createWalletCredential({
          type,
          label,
          entitySecret,
          isDefault,
        });

        reply.status(StatusCodes.OK).send({
          result: {
            id: createdWalletCredential.id,
            type: createdWalletCredential.type,
            label: createdWalletCredential.label,
            isDefault: createdWalletCredential.isDefault,
            createdAt: createdWalletCredential.createdAt.toISOString(),
            updatedAt: createdWalletCredential.updatedAt.toISOString(),
          },
        });
      } catch (e: unknown) {
        if (e instanceof WalletCredentialsError) {
          throw createCustomError(
            e.message,
            StatusCodes.BAD_REQUEST,
            "WALLET_CREDENTIAL_ERROR",
          );
        }
      }
    },
  });
};

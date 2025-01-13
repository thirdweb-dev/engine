import { type Keypairs, Prisma } from "@prisma/client";
import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertKeypair } from "../../../../shared/db/keypair/insert";
import { isWellFormedPublicKey } from "../../../../shared/utils/crypto";
import { createCustomError } from "../../../middleware/error";
import {
  KeypairAlgorithmSchema,
  KeypairSchema,
  toKeypairSchema,
} from "../../../../shared/schemas/keypair";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

const requestBodySchema = Type.Object({
  publicKey: Type.String({
    description:
      "The public key of your keypair beginning with '-----BEGIN PUBLIC KEY-----'.",
  }),
  algorithm: KeypairAlgorithmSchema,
  label: Type.Optional(Type.String()),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    keypair: KeypairSchema,
  }),
});

export async function addKeypair(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/auth/keypair/add",
    schema: {
      summary: "Add public key",
      description: "Add the public key for a keypair",
      tags: ["Keypair"],
      operationId: "add",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { publicKey: publicKeyRaw, algorithm, label } = req.body;
      const publicKey = publicKeyRaw.trim();

      if (!isWellFormedPublicKey(publicKey)) {
        throw createCustomError(
          "Invalid public key. Make sure it starts with '-----BEGIN PUBLIC KEY-----'.",
          StatusCodes.BAD_REQUEST,
          "INVALID_PUBLIC_KEY",
        );
      }

      let keypair: Keypairs;
      try {
        keypair = await insertKeypair({
          publicKey,
          algorithm,
          label,
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === "P2002") {
            throw createCustomError(
              "Public key already imported.",
              StatusCodes.BAD_REQUEST,
              "PUBLIC_KEY_EXISTS",
            );
          }
        }
        throw e;
      }

      res.status(StatusCodes.OK).send({
        result: {
          keypair: toKeypairSchema(keypair),
        },
      });
    },
  });
}

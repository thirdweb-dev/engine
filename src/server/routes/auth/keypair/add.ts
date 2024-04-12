import { Keypairs, Prisma } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertKeypair } from "../../../../db/keypair/insert";
import { isWellFormedPublicKey } from "../../../../utils/crypto";
import { createCustomError } from "../../../middleware/error";
import {
  KeypairAlgorithmSchema,
  KeypairSchema,
  toKeypairSchema,
} from "../../../schemas/keypairs";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const BodySchema = Type.Object({
  publicKey: Type.String({
    description:
      "The public key of your keypair beginning with '-----BEGIN PUBLIC KEY-----'.",
  }),
  algorithm: KeypairAlgorithmSchema,
  label: Type.Optional(Type.String()),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    keypair: KeypairSchema,
  }),
});

export async function addKeypair(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/auth/keypair/add",
    schema: {
      summary: "Add public key",
      description: "Add the public key for a keypair",
      tags: ["Keypair"],
      operationId: "add",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
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

      res.status(200).send({
        result: {
          keypair: toKeypairSchema(keypair),
        },
      });
    },
  });
}

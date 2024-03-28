import { Keypairs, Prisma } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { insertKeypair } from "../../../../db/keypair/insert";
import { createCustomError } from "../../../middleware/error";
import { KeypairSchema } from "../../../schemas/auth";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const BodySchema = Type.Object({
  publicKey: Type.String({
    description:
      "An ES256 public key beginning with '-----BEGIN PUBLIC KEY-----'",
  }),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    keypair: KeypairSchema,
  }),
});

export async function importKeypair(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/auth/keypair/import",
    schema: {
      summary: "Import public key",
      description: "Import the public key for an ES256 keypair",
      tags: ["Keypair"],
      operationId: "import",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { publicKey } = req.body;

      if (
        !publicKey.startsWith("-----BEGIN PUBLIC KEY-----\n") ||
        !publicKey.endsWith("\n-----END PUBLIC KEY-----")
      ) {
        throw createCustomError(
          "Invalid ES256 public key. Make sure it starts with '-----BEGIN PUBLIC KEY-----'.",
          StatusCodes.BAD_REQUEST,
          "INVALID_PUBLIC_KEY",
        );
      }

      let keypair: Keypairs;
      try {
        keypair = await insertKeypair({ publicKey });
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
        result: { keypair },
      });
    },
  });
}

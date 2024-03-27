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

export async function importPublicKey(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/auth/keypair/import",
    schema: {
      summary: "Import public key",
      description: "Import a public key from an ES256 keypair",
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
          "Invalid ES256 public key.",
          StatusCodes.BAD_REQUEST,
          "INVALID_PUBLIC_KEY",
        );
      }

      const keypair = await insertKeypair({ publicKey });

      res.status(200).send({
        result: { keypair },
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteKeypair } from "../../../../db/keypair/delete";
import { keypairCache } from "../../../../utils/cache/keypair";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const BodySchema = Type.Object({
  publicKey: Type.String({
    description:
      "An ES256 public key beginning with '-----BEGIN PUBLIC KEY-----'",
  }),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    message: Type.String(),
  }),
});

export async function revokePublicKey(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/auth/keypair/revoke",
    schema: {
      summary: "Revoke public key",
      description: "Revoke a public key",
      tags: ["Keypair"],
      operationId: "revoke",
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

      await deleteKeypair({ publicKey });
      keypairCache.clear();

      res.status(200).send({
        result: {
          message: "OK",
        },
      });
    },
  });
}

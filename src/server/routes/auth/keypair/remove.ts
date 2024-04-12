import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteKeypair } from "../../../../db/keypair/delete";
import { keypairCache } from "../../../../utils/cache/keypair";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const BodySchema = Type.Object({
  hash: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function removePublicKey(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/auth/keypair/remove",
    schema: {
      summary: "Remove public key",
      description: "Remove the public key for a keypair",
      tags: ["Keypair"],
      operationId: "remove",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { hash } = req.body;

      await deleteKeypair({ hash });
      keypairCache.clear();

      res.status(200).send({
        result: { success: true },
      });
    },
  });
}

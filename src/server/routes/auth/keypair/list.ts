import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { listKeypairs } from "../../../../db/keypair/list";
import { KeypairSchema } from "../../../schemas/keypairs";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const ReplySchema = Type.Object({
  result: Type.Array(KeypairSchema),
});

export async function listPublicKeys(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/auth/keypair/get-all",
    schema: {
      summary: "List public keys",
      description: "List the public keys configured with Engine",
      tags: ["Keypair"],
      operationId: "list",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const keypairs = await listKeypairs();

      res.status(200).send({
        result: keypairs,
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { listKeypairs } from "../../../../db/keypair/list";
import { KeypairSchema, toKeypairSchema } from "../../../schemas/keypairs";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const responseBodySchema = Type.Object({
  result: Type.Array(KeypairSchema),
});

export async function listPublicKeys(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
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
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const keypairs = await listKeypairs();

      res.status(StatusCodes.OK).send({
        result: keypairs.map(toKeypairSchema),
      });
    },
  });
}

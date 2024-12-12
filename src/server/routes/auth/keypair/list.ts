import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { listKeypairs } from "../../../../shared/db/keypair/list";
import {
  KeypairSchema,
  toKeypairSchema,
} from "../../../../shared/schemas/keypair";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

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
    handler: async (_req, res) => {
      const keypairs = await listKeypairs();

      res.status(StatusCodes.OK).send({
        result: keypairs.map(toKeypairSchema),
      });
    },
  });
}

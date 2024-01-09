import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";

const BodySchema = Type.Object({
  id: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function revokeBundler(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/bundler/revoke",
    schema: {
      summary: "Revoke a bundler",
      description: "Revoke a bundler",
      tags: ["Bundler"],
      operationId: "revoke",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { id } = req.body;

      await prisma.bundlers.delete({
        where: {
          id,
        },
      });

      res.status(200).send({
        result: {
          success: true,
        },
      });
    },
  });
}

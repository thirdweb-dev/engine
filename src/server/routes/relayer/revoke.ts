import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const BodySchema = Type.Object({
  id: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function revokeRelayer(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/relayer/revoke",
    schema: {
      summary: "Revoke a relayer",
      description: "Revoke a relayer",
      tags: ["Relayer"],
      operationId: "revoke",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { id } = req.body;

      await prisma.relayers.delete({
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

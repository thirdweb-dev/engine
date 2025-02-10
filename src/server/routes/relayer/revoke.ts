import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../shared/db/client.js";
import { standardResponseSchema } from "../../schemas/shared-api-schemas.js";

const requestBodySchema = Type.Object({
  id: Type.String(),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function revokeRelayer(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/relayer/revoke",
    schema: {
      summary: "Revoke a relayer",
      description: "Revoke a relayer",
      tags: ["Relayer"],
      operationId: "revokeRelayer",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { id } = req.body;

      await prisma.relayers.delete({
        where: {
          id,
        },
      });

      res.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../db/client";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const ReplySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      walletAddress: Type.String(),
      permissions: Type.String(),
      label: Type.Union([Type.String(), Type.Null()]),
    }),
  ),
});

export async function getAllPermissions(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/auth/permissions/get-all",
    schema: {
      summary: "Get all permissions",
      description: "Get all users with their corresponding permissions",
      tags: ["Permissions"],
      operationId: "getAll",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const permissions = await prisma.permissions.findMany();
      res.status(200).send({
        result: permissions,
      });
    },
  });
}

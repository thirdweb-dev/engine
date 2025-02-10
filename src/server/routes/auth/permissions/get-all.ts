import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../../shared/db/client.js";
import { AddressSchema } from "../../../schemas/address.js";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas.js";

const responseBodySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      walletAddress: AddressSchema,
      permissions: Type.String(),
      label: Type.Union([Type.String(), Type.Null()]),
    }),
  ),
});

export async function getAllPermissions(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/auth/permissions/get-all",
    schema: {
      summary: "Get all permissions",
      description: "Get all users with their corresponding permissions",
      tags: ["Permissions"],
      operationId: "listAdmins",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (_req, res) => {
      const permissions = await prisma.permissions.findMany();
      res.status(StatusCodes.OK).send({
        result: permissions,
      });
    },
  });
}

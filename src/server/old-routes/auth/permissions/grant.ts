import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updatePermissions } from "../../../../shared/db/permissions/update-permissions.js";
import { AddressSchema } from "../../../schemas/address.js";
import { permissionsSchema } from "../../../../shared/schemas/auth.js";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas.js";

const requestBodySchema = Type.Object({
  walletAddress: AddressSchema,
  permissions: permissionsSchema,
  label: Type.Optional(Type.String()),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function grantPermissions(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/auth/permissions/grant",
    schema: {
      summary: "Grant permissions to user",
      description: "Grant permissions to a user",
      tags: ["Permissions"],
      operationId: "grantAdmin",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { walletAddress, permissions, label } = req.body;
      await updatePermissions({
        walletAddress,
        permissions,
        label,
      });
      res.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}

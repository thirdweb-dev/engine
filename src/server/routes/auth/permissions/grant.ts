import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updatePermissions } from "../../../../db/permissions/updatePermissions";
import { AddressSchema } from "../../../schemas/address";
import { permissionsSchema } from "../../../schemas/auth";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

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
      operationId: "grant",
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

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deletePermissions } from "../../../../shared/db/permissions/delete-permissions";
import { AddressSchema } from "../../../schemas/address";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

const requestBodySchema = Type.Object({
  walletAddress: AddressSchema,
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function revokePermissions(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/auth/permissions/revoke",
    schema: {
      summary: "Revoke permissions from user",
      description: "Revoke a user's permissions",
      tags: ["Permissions"],
      operationId: "revokeAdmin",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { walletAddress } = req.body;
      await deletePermissions({
        walletAddress,
      });
      res.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}

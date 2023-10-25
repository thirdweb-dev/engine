import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updatePermissions } from "../../../../src/db/permissions/updatePermissions";
import { PermissionsSchema } from "../../../schemas/auth";

const BodySchema = Type.Object({
  walletAddress: Type.String(),
  permissions: PermissionsSchema,
  label: Type.Optional(Type.String()),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function grantPermissions(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/auth/permissions/grant",
    schema: {
      summary: "Grant permissions to user",
      description: "Grant permissions to a user",
      tags: ["Permissions"],
      operationId: "grantPermissions",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { walletAddress, permissions, label } = req.body;
      await updatePermissions({
        walletAddress,
        permissions,
        label,
      });
      res.status(200).send({
        result: {
          success: true,
        },
      });
    },
  });
}

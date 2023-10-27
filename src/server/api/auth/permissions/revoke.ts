import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deletePermissions } from "../../../../db/permissions/deletePermissions";

const BodySchema = Type.Object({
  walletAddress: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function revokePermissions(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/auth/permissions/revoke",
    schema: {
      summary: "Revoke permissions from user",
      description: "Revoke a user's permissions",
      tags: ["Permissions"],
      operationId: "revoke",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { walletAddress } = req.body;
      await deletePermissions({
        walletAddress,
      });
      res.status(200).send({
        result: {
          success: true,
        },
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteAllWalletNonces } from "../../../db/wallets/deleteAllWalletNonces";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const responseSchema = Type.Object({
  result: Type.Object({
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    status: "success",
  },
};

export const resetBackendWallet = async (fastify: FastifyInstance) => {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/reset-nonces",
    schema: {
      summary: "Reset all nonces",
      description:
        "Reset nonces for all backend wallets. This is for debugging purposes and does not impact held tokens.",
      tags: ["Backend Wallet"],
      operationId: "resetNonces",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      await deleteAllWalletNonces({});

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
};

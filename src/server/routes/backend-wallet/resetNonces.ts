import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { deleteWalletNonces } from "../../../db/wallets/walletNonce";
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

export const resetBackendWalletNonces = async (fastify: FastifyInstance) => {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/reset-nonces",
    schema: {
      summary: "Reset nonces",
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
      await deleteWalletNonces();

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
};

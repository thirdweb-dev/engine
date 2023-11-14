import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateWalletDetails } from "../../../db/wallets/updateWalletDetails";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const BodySchema = Type.Object({
  walletAddress: Type.String(),
  label: Type.Optional(Type.String()),
});

const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: Type.String(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    walletAddress: "0x....",
    status: "success",
  },
};

export const updateBackendWallet = async (fastify: FastifyInstance) => {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/update",
    schema: {
      summary: "Update backend wallet",
      description: "Update a backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "update",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { walletAddress, label } = req.body;

      await updateWalletDetails({
        address: walletAddress,
        label,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          status: "success",
        },
      });
    },
  });
};

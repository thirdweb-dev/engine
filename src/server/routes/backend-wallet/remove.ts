import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Address } from "thirdweb";
import { deleteWalletDetails } from "../../../db/wallets/deleteWalletDetails";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const requestSchema = Type.Object({
  walletAddress: Type.Optional(Type.String()),
});

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

export const removeBackendWallet = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "DELETE",
    url: "/backend-wallet/:walletAddress",
    schema: {
      summary: "Remove backend wallet",
      description:
        "Remove an existing backend wallet. NOTE: This is an irreversible action for local wallets. Ensure any funds are transferred out before removing a local wallet.",
      tags: ["Backend Wallet"],
      operationId: "remove",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { walletAddress: _walletAddress } = req.params;
      if (!_walletAddress) {
        throw createCustomError(
          'Missing "walletAddress".',
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      const walletAddress = _walletAddress.toLowerCase() as Address;
      await deleteWalletDetails(walletAddress);

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
};

import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address } from "thirdweb";
import { deleteWalletDetails } from "../../../db/wallets/deleteWalletDetails";
import { AddressSchema } from "../../schemas/address";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const requestParamSchema = Type.Object({
  walletAddress: AddressSchema,
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
    Params: Static<typeof requestParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "DELETE",
    url: "/backend-wallet/:walletAddress",
    schema: {
      summary: "Remove backend wallet",
      description:
        "Remove an existing backend wallet. NOTE: This is an irreversible action for local wallets. Ensure any funds are transferred out before removing a local wallet.",
      tags: ["Backend Wallet"],
      operationId: "removeBackendWallet",
      params: requestParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { walletAddress } = req.params;

      await deleteWalletDetails(walletAddress as Address);

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
};

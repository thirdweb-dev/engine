import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateWalletDetails } from "../../../shared/db/wallets/update-wallet-details.js";
import { AddressSchema } from "../../schemas/address.js";
import { standardResponseSchema } from "../../schemas/shared-api-schemas.js";

const requestBodySchema = Type.Object({
  walletAddress: AddressSchema,
  label: Type.Optional(Type.String()),
});

const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: AddressSchema,
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
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/update",
    schema: {
      summary: "Update backend wallet",
      description: "Update a backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "update",
      body: requestBodySchema,
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

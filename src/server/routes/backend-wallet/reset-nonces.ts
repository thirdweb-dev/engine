import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAddress } from "thirdweb";
import {
  deleteNoncesForBackendWallets,
  getUsedBackendWallets,
  syncLatestNonceFromOnchain,
} from "../../../shared/db/wallets/wallet-nonce";
import { AddressSchema } from "../../schemas/address";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Object({
  chainId: Type.Optional(
    Type.Number({
      description: "The chain ID to reset nonces for.",
    }),
  ),
  walletAddress: Type.Optional({
    ...AddressSchema,
    description:
      "The backend wallet address to reset nonces for. Omit to reset all backend wallets.",
  }),
});

const responseSchema = Type.Object({
  result: Type.Object({
    status: Type.String(),
    count: Type.Number({
      description: "The number of backend wallets processed.",
    }),
  }),
});

responseSchema.example = {
  result: {
    status: "success",
    count: 1,
  },
};

export const resetBackendWalletNoncesRoute = async (
  fastify: FastifyInstance,
) => {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/reset-nonces",
    schema: {
      summary: "Reset nonces",
      description:
        "Reset nonces for all backend wallets. This is for debugging purposes and does not impact held tokens.",
      tags: ["Backend Wallet"],
      operationId: "resetNonces",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { chainId, walletAddress: _walletAddress } = req.body;

      // If chain+wallet are provided, only process that wallet.
      // Otherwise process all used wallets that has nonce state.
      const backendWallets =
        chainId && _walletAddress
          ? [{ chainId, walletAddress: getAddress(_walletAddress) }]
          : await getUsedBackendWallets();

      const RESYNC_BATCH_SIZE = 50;
      for (let i = 0; i < backendWallets.length; i += RESYNC_BATCH_SIZE) {
        const batch = backendWallets.slice(i, i + RESYNC_BATCH_SIZE);

        // Delete nonce state for these backend wallets.
        await deleteNoncesForBackendWallets(backendWallets);

        // Resync nonces for these backend wallets.
        await Promise.allSettled(
          batch.map(({ chainId, walletAddress }) =>
            syncLatestNonceFromOnchain(chainId, walletAddress),
          ),
        );
      }

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
          count: backendWallets.length,
        },
      });
    },
  });
};

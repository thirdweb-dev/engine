import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAddress, type Address } from "thirdweb";
import {
  deleteAllNonces,
  syncLatestNonceFromOnchain,
} from "../../../db/wallets/walletNonce";
import { redis } from "../../../utils/redis/redis";
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

export const resetAllBackendWalletNoncesRoute = async (
  fastify: FastifyInstance,
) => {
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
      const backendWallets = await getUsedBackendWallets();

      // Delete all nonce state for used backend wallets.
      await deleteAllNonces();

      // Attempt to re-sync nonces for used backend wallets.
      await Promise.allSettled(
        backendWallets.map(({ chainId, walletAddress }) =>
          syncLatestNonceFromOnchain(chainId, walletAddress),
        ),
      );

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
};

// TODO: replace with getUsedBackendWallets() helper.
const getUsedBackendWallets = async (): Promise<
  {
    chainId: number;
    walletAddress: Address;
  }[]
> => {
  const keys = await redis.keys("nonce:*:*");
  return keys.map((key) => {
    const tokens = key.split(":");
    return {
      chainId: parseInt(tokens[1]),
      walletAddress: getAddress(tokens[2]),
    };
  });
};

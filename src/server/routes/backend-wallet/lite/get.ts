import { randomBytes } from "node:crypto";
import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { checksumAddress } from "thirdweb/utils";
import { createBackendWalletLiteAccess } from "../../../../shared/db/wallets/create-backend-wallet-lite-access";
import { getBackendWalletLiteAccess } from "../../../../shared/db/wallets/get-backend-wallet-lite-access";
import { AddressSchema } from "../../../schemas/address";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";
import { createCustomError } from "../../../middleware/error";

const requestSchema = Type.Object({
  teamId: Type.String({
    description: "Wallets are listed for this team.",
  }),
});

const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: Type.Union([AddressSchema, Type.Null()], {
      description: "The Engine Lite wallet address, if created.",
    }),
    salt: Type.String({
      description: "The salt used to encrypt the Engine Lite wallet address..",
    }),
  }),
});

responseSchema.example = {
  result: {
    walletAddress: "0x....",
    salt: "2caaddce3d66ed4bee1a6ba9a29c98eb6d375635f62941655702bdff74939023",
  },
};

export const listBackendWalletsLiteRoute = async (fastify: FastifyInstance) => {
  fastify.withTypeProvider().route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/lite/:teamId",
    schema: {
      summary: "List backend wallets (Lite)",
      description: "List backend wallets used for Engine Lite.",
      tags: ["Backend Wallet"],
      operationId: "listBackendWalletsLite",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
    },
    handler: async (req, reply) => {
      const dashboardUserAddress = checksumAddress(req.user.address);
      if (!dashboardUserAddress) {
        throw createCustomError(
          "This endpoint must be called from the thirdweb dashboard.",
          StatusCodes.FORBIDDEN,
          "DASHBOARD_AUTH_REQUIRED",
        );
      }

      const { teamId } = req.params;
      const liteAccess = await getBackendWalletLiteAccess({ teamId });

      // If a wallet exists, return it.
      if (liteAccess?.accountAddress) {
        return reply.status(StatusCodes.OK).send({
          result: {
            walletAddress: liteAccess.accountAddress,
            salt: liteAccess.salt,
          },
        });
      }

      // Else generate a salt and have the developer sign it.
      const salt = randomBytes(32).toString("hex");
      await createBackendWalletLiteAccess({
        teamId,
        dashboardUserAddress,
        salt,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress: null,
          salt,
        },
      });
    },
  });
};

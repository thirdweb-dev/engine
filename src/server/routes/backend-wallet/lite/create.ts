import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { checksumAddress } from "thirdweb/utils";
import { getBackendWalletLiteAccess } from "../../../../shared/db/wallets/get-backend-wallet-lite-access";
import { AddressSchema } from "../../../schemas/address";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";
import { createCustomError } from "../../../middleware/error";
import {
  DEFAULT_ACCOUNT_FACTORY_V0_7,
  ENTRYPOINT_ADDRESS_v0_7,
} from "thirdweb/wallets/smart";
import { createSmartLocalWalletDetails } from "../../../utils/wallets/create-smart-wallet";
import { updateBackendWalletLiteAccess } from "../../../../shared/db/wallets/update-backend-wallet-lite-access";
import { assertAuthenticationType } from "../../../utils/auth";

const requestSchema = Type.Object({
  teamId: Type.String({
    description: "Wallets are listed for this team.",
  }),
});

const requestBodySchema = Type.Object({
  salt: Type.String(),
  litePassword: Type.String(),
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

export async function createBackendWalletLiteRoute(fastify: FastifyInstance) {
  fastify.withTypeProvider().route<{
    Params: Static<typeof requestSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/lite/:teamId",
    schema: {
      summary: "Create backend wallet (Lite)",
      description: "Create a backend wallet used for Engine Lite.",
      tags: ["Backend Wallet"],
      operationId: "createBackendWalletsLite",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
      hide: true,
    },
    handler: async (req, reply) => {
      assertAuthenticationType(req, ["dashboard"]);

      const { teamId } = req.params;
      const { salt, litePassword } = req.body;
      const dashboardUserAddress = checksumAddress(
        req.authentication.user.address,
      );

      const liteAccess = await getBackendWalletLiteAccess({ teamId });
      if (
        !liteAccess ||
        liteAccess.teamId !== teamId ||
        liteAccess.dashboardUserAddress !== dashboardUserAddress ||
        liteAccess.salt !== salt
      ) {
        throw createCustomError(
          "The salt does not exist for this user. Try requesting a backend wallet again.",
          StatusCodes.BAD_REQUEST,
          "INVALID_LITE_WALLET_SALT",
        );
      }
      if (liteAccess.accountAddress) {
        throw createCustomError(
          "A backend wallet already exists for this team.",
          StatusCodes.BAD_REQUEST,
          "LITE_WALLET_ALREADY_EXISTS",
        );
      }

      // Generate a signer wallet and store the smart:local wallet, encrypted with `litePassword`.
      const walletDetails = await createSmartLocalWalletDetails({
        label: `${teamId} (${new Date().toISOString()})`,
        accountFactoryAddress: DEFAULT_ACCOUNT_FACTORY_V0_7,
        entrypointAddress: ENTRYPOINT_ADDRESS_v0_7,
        encryptionPassword: litePassword,
      });
      if (!walletDetails.accountSignerAddress || !walletDetails.encryptedJson) {
        throw new Error(
          "Created smart:local wallet is missing required fields.",
        );
      }

      await updateBackendWalletLiteAccess({
        id: liteAccess.id,
        accountAddress: walletDetails.address,
        signerAddress: walletDetails.accountSignerAddress,
        encryptedJson: walletDetails.encryptedJson,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress: walletDetails.address,
          salt,
        },
      });
    },
  });
}

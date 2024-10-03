import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WalletType } from "../../../schema/wallet";
import { getConfig } from "../../../utils/cache/getConfig";
import { createCustomError } from "../../middleware/error";
import { AddressSchema } from "../../schemas/address";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  CreateAwsKmsWalletError,
  createAwsKmsWallet,
} from "../../utils/wallets/createAwsKmsWallet";
import {
  CreateGcpKmsWalletError,
  createGcpKmsWallet,
} from "../../utils/wallets/createGcpKmsWallet";
import { createLocalWallet } from "../../utils/wallets/createLocalWallet";

const requestBodySchema = Type.Object({
  label: Type.Optional(Type.String()),
  type: Type.Optional(
    Type.Enum(WalletType, {
      description:
        "Optional wallet type. If not provided, the default wallet type will be used.",
    }),
  ),
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

export const createBackendWallet = async (fastify: FastifyInstance) => {
  fastify.withTypeProvider().route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/create",
    schema: {
      summary: "Create backend wallet",
      description: "Create a backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "create",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { label } = req.body;

      let walletAddress: string;
      const config = await getConfig();

      const walletType =
        req.body.type ??
        config.walletConfiguration.legacyWalletType_removeInNextBreakingChange;

      switch (walletType) {
        case WalletType.local:
          walletAddress = await createLocalWallet({ label });
          break;
        case WalletType.awsKms:
          try {
            walletAddress = await createAwsKmsWallet({ label });
          } catch (e) {
            if (e instanceof CreateAwsKmsWalletError) {
              throw createCustomError(
                e.message,
                StatusCodes.BAD_REQUEST,
                "CREATE_AWS_KMS_WALLET_ERROR",
              );
            }
            throw e;
          }
          break;
        case WalletType.gcpKms:
          try {
            walletAddress = await createGcpKmsWallet({ label });
          } catch (e) {
            if (e instanceof CreateGcpKmsWalletError) {
              throw createCustomError(
                e.message,
                StatusCodes.BAD_REQUEST,
                "CREATE_GCP_KMS_WALLET_ERROR",
              );
            }
            throw e;
          }
          break;
      }

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          status: "success",
        },
      });
    },
  });
};

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAddress } from "thirdweb";
import {
  DEFAULT_ACCOUNT_FACTORY_V0_7,
  ENTRYPOINT_ADDRESS_v0_7,
} from "thirdweb/wallets/smart";
import {
  LegacyWalletType,
  WalletType,
  CircleWalletType,
} from "../../../shared/schemas/wallet";
import { getConfig } from "../../../shared/utils/cache/get-config";
import { createCustomError } from "../../middleware/error";
import { AddressSchema } from "../../schemas/address";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import {
  CreateAwsKmsWalletError,
  createAwsKmsWalletDetails,
} from "../../utils/wallets/create-aws-kms-wallet";
import {
  CreateGcpKmsWalletError,
  createGcpKmsWalletDetails,
} from "../../utils/wallets/create-gcp-kms-wallet";
import { createLocalWalletDetails } from "../../utils/wallets/create-local-wallet";
import {
  createSmartAwsWalletDetails,
  createSmartGcpWalletDetails,
  createSmartLocalWalletDetails,
} from "../../utils/wallets/create-smart-wallet";
import {
  CircleWalletError,
  createCircleWalletDetails,
} from "../../utils/wallets/circle";
import assert from "node:assert";

const requestBodySchema = Type.Union([
  // Base schema for non-circle wallet types
  Type.Object({
    label: Type.Optional(Type.String()),
    type: Type.Optional(Type.Union([Type.Enum(LegacyWalletType)])),
  }),

  // Schema for circle and smart:circle wallet types
  Type.Object({
    label: Type.Optional(Type.String()),
    type: Type.Union([Type.Enum(CircleWalletType)]),
    credentialId: Type.String(),
    walletSetId: Type.Optional(Type.String()),
  }),
]);

const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: AddressSchema,
    status: Type.String(),
    type: Type.Enum(WalletType),
  }),
});

responseSchema.example = {
  result: {
    walletAddress: "0x....",
    status: "success",
    type: WalletType.local,
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
          walletAddress = await createLocalWalletDetails({ label });
          break;
        case WalletType.awsKms:
          try {
            walletAddress = await createAwsKmsWalletDetails({ label });
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
            walletAddress = await createGcpKmsWalletDetails({ label });
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
        case CircleWalletType.circle:
          {
            // we need this if here for typescript to statically type the credentialId and walletSetId
            assert(req.body.type === "circle", "Expected circle wallet type");
            const { credentialId, walletSetId } = req.body;

            try {
              const wallet = await createCircleWalletDetails({
                label,
                isSmart: false,
                credentialId,
                walletSetId,
              });

              walletAddress = getAddress(wallet.address);
            } catch (e) {
              if (e instanceof CircleWalletError) {
                throw createCustomError(
                  e.message,
                  StatusCodes.BAD_REQUEST,
                  "CREATE_CIRCLE_WALLET_ERROR",
                );
              }
              throw e;
            }
          }
          break;

        case CircleWalletType.smartCircle:
          {
            // we need this if here for typescript to statically type the credentialId and walletSetId
            assert(req.body.type === "circle", "Expected circle wallet type");
            const { credentialId, walletSetId } = req.body;

            try {
              const wallet = await createCircleWalletDetails({
                label,
                isSmart: true,
                credentialId,
                walletSetId,
              });

              walletAddress = getAddress(wallet.address);
            } catch (e) {
              if (e instanceof CircleWalletError) {
                throw createCustomError(
                  e.message,
                  StatusCodes.BAD_REQUEST,
                  "CREATE_CIRCLE_WALLET_ERROR",
                );
              }
              throw e;
            }
          }
          break;

        case WalletType.smartAwsKms:
          try {
            const smartAwsWallet = await createSmartAwsWalletDetails({
              label,
              accountFactoryAddress: DEFAULT_ACCOUNT_FACTORY_V0_7,
              entrypointAddress: ENTRYPOINT_ADDRESS_v0_7,
            });

            walletAddress = getAddress(smartAwsWallet.address);
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
        case WalletType.smartGcpKms:
          try {
            const smartGcpWallet = await createSmartGcpWalletDetails({
              label,
              accountFactoryAddress: DEFAULT_ACCOUNT_FACTORY_V0_7,
              entrypointAddress: ENTRYPOINT_ADDRESS_v0_7,
            });
            walletAddress = getAddress(smartGcpWallet.address);
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
        case WalletType.smartLocal:
          {
            const smartLocalWallet = await createSmartLocalWalletDetails({
              label,
              accountFactoryAddress: DEFAULT_ACCOUNT_FACTORY_V0_7,
              entrypointAddress: ENTRYPOINT_ADDRESS_v0_7,
            });
            walletAddress = getAddress(smartLocalWallet.address);
          }
          break;
        default:
          throw createCustomError(
            "Unkown wallet type",
            StatusCodes.BAD_REQUEST,
            "CREATE_WALLET_ERROR",
          );
      }

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          type: walletType as WalletType,
          status: "success",
        },
      });
    },
  });
};

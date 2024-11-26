import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAddress } from "thirdweb";
import {
  DEFAULT_ACCOUNT_FACTORY_V0_7,
  ENTRYPOINT_ADDRESS_v0_7,
} from "thirdweb/wallets/smart";
import { WalletType } from "../../../schema/wallet";
import { getConfig } from "../../../utils/cache/getConfig";
import { createCustomError } from "../../middleware/error";
import { AddressSchema } from "../../schemas/address";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  CreateAwsKmsWalletError,
  createAwsKmsWalletDetails,
} from "../../utils/wallets/createAwsKmsWallet";
import {
  CreateGcpKmsWalletError,
  createGcpKmsWalletDetails,
} from "../../utils/wallets/createGcpKmsWallet";
import { createLocalWalletDetails } from "../../utils/wallets/createLocalWallet";
import {
  createSmartAwsWalletDetails,
  createSmartGcpWalletDetails,
  createSmartLocalWalletDetails,
} from "../../utils/wallets/createSmartWallet";

const requestBodySchema = Type.Object({
  label: Type.Optional(Type.String()),
  type: Type.Optional(
    Type.Enum(WalletType, {
      description:
        "Type of new wallet to create. It is recommended to always provide this value. If not provided, the default wallet type will be used.",
    }),
  ),
});

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
      }

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          type: walletType,
          status: "success",
        },
      });
    },
  });
};

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { createAwsKmsWallet } from "../../utils/wallets/createAwsKmsWallet";
import { createGcpKmsWallet } from "../../utils/wallets/createGcpKmsWallet";
import { createLocalWallet } from "../../utils/wallets/createLocalWallet";

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: Type.String(),
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    walletAddress: "0x....",
    status: "success",
  },
};

export const createWallet = async (fastify: FastifyInstance) => {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/create",
    schema: {
      description: "Create a new backend wallet",
      tags: ["Wallet"],
      operationId: "wallet_create",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      let walletAddress: string;
      switch (env.WALLET_CONFIGURATION.type) {
        case WalletType.local:
          walletAddress = await createLocalWallet();
          break;
        case WalletType.awsKms:
          walletAddress = await createAwsKmsWallet();
          break;
        case WalletType.gcpKms:
          walletAddress = await createGcpKmsWallet();
          break;
      }

      res.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          status: "success",
        },
      });
    },
  });
};

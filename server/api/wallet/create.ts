import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { AliasSchema } from "../../schemas/wallet";
import { createAwsKmsWallet } from "../../utils/wallets/createAwsKmsWallet";
import { createGcpKmsWallet } from "../../utils/wallets/createGcpKmsWallet";
import { createLocalWallet } from "../../utils/wallets/createLocalWallet";

// INPUT
const requestSchema = Type.Object({
  ...AliasSchema.properties,
});

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
    Body: Static<typeof requestSchema>;
  }>({
    method: "POST",
    url: "/wallet/create",
    schema: {
      description: "Create a new backend wallet",
      tags: ["Wallet"],
      operationId: "wallet_create",
      body: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      const { alias } = req.body;
      let walletAddress: string;
      switch (env.WALLET_CONFIGURATION.type) {
        case WalletType.local:
          walletAddress = await createLocalWallet(alias);
          break;
        case WalletType.awsKms:
          walletAddress = await createAwsKmsWallet(alias);
          break;
        case WalletType.gcpKms:
          walletAddress = await createGcpKmsWallet(alias);
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

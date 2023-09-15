import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../../../core/env";
import { WalletType } from "../../../src/schema/wallet";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { createAwsKmsWallet } from "../../utils/wallets/createAwsKmsWallet";
import { createGcpKmsWallet } from "../../utils/wallets/createGcpKmsWallet";
import { createLocalWallet } from "../../utils/wallets/createLocalWallet";

// INPUTS
const requestBodySchema = Type.Object({
  walletType: Type.String({
    description: "Wallet Type",
    examples: ["aws-kms", "gcp-kms", "local"],
  }),
});

requestBodySchema.examples = [
  {
    walletType: "aws-kms",
  },
  {
    walletType: "gcp-kms",
  },
];

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
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/wallet/create",
    schema: {
      description: "Create a new backend wallet",
      tags: ["Wallet"],
      operationId: "wallet_create",
      body: requestBodySchema,
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

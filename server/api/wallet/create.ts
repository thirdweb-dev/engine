import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WalletType } from "../../../src/schema/wallet";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { WalletConfigSchema } from "../../schemas/wallet";
import { createAwsKmsWallet } from "../../utils/wallets/createAwsKmsWallet";
import { createGcpKmsWallet } from "../../utils/wallets/createGcpKmsWallet";
import { createLocalWallet } from "../../utils/wallets/createLocalWallet";

// INPUT
const requestSchema = Type.Object({
  ...WalletConfigSchema.properties,
});

requestSchema.examples = [
  {
    alias: "my-aws-kms-wallet",
    walletType: WalletType.awsKms,
  },
  {
    alias: "my-gcp-kms-wallet",
    walletType: WalletType.gcpKms,
  },
  {
    alias: "my-local-wallet",
    walletType: WalletType.local,
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
      const { alias, walletType } = req.body;
      let walletAddress: string;
      switch (walletType) {
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

      if (!walletAddress) {
        throw new Error(
          "Unable to create wallet. Please check the wallet-type.",
        );
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

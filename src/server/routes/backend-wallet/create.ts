import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WalletType } from "../../../schema/wallet";
import { getConfig } from "../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { createAwsKmsWallet } from "../../utils/wallets/createAwsKmsWallet";
import { createGcpKmsWallet } from "../../utils/wallets/createGcpKmsWallet";
import { createLocalWallet } from "../../utils/wallets/createLocalWallet";

const requestBodySchema = Type.Object({
  label: Type.Optional(Type.String()),
});

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

export const createBackendWallet = async (fastify: FastifyInstance) => {
  fastify.route<{
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
      switch (config.walletConfiguration.type) {
        case WalletType.local:
          walletAddress = await createLocalWallet({ label });
          break;
        case WalletType.awsKms:
          walletAddress = await createAwsKmsWallet({ label });
          break;
        case WalletType.gcpKms:
          walletAddress = await createGcpKmsWallet({ label });
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

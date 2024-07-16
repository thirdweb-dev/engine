import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { WalletType } from "../../../schema/wallet";
import { getConfig } from "../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { createAwsKmsWallet } from "../../utils/wallets/createAwsKmsWallet";
import { createGcpKmsWallet } from "../../utils/wallets/createGcpKmsWallet";
import { createLocalWallet } from "../../utils/wallets/createLocalWallet";
import { createSmartBackendWallet } from "../../utils/wallets/createSmartBackendWallet";

const requestBodySchema = Type.Object({
  label: Type.Optional(Type.String()),
  walletType: Type.Optional(Type.String({ enum: Object.values(WalletType) })),
});

const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: Type.String(),
    status: Type.String(),
  }),
});

const errorResponseSchema = Type.Object({
  result: Type.Object({
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
      //TODO added type on body here, need dashboard update
      const { label, walletType = "smart" } = req.body;

      let walletAddress: string = "";
      switch (walletType) {
        case WalletType.local:
          walletAddress = await createLocalWallet({ label });
          break;
        case WalletType.awsKms:
          walletAddress = await createAwsKmsWallet({ label });
          break;
        case WalletType.gcpKms:
          walletAddress = await createGcpKmsWallet({ label });
          break;
        case WalletType.smart:
          walletAddress = await createSmartBackendWallet({ label });
          break;
      }

      if (!walletAddress) {
        //TODO fix error response type so don't need to include walletAddress
        return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
          result: {
            walletAddress: "",
            status: "error",
          },
        });
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

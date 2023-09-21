import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../core/schema";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../utilities/chain";
import { createSmartWallet } from "../../utils/wallets/createSmartWallet";

const ParamsSchema = Type.Object({
  network: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    walletAddress: Type.String(),
  }),
});

export const smartWalletCreate = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/smartWallet/:network/create",
    schema: {
      description: "Create a new smart wallet",
      tags: ["Wallet", "Smart Wallet"],
      operationId: "smartWallet_create",
      params: ParamsSchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { network } = req.params;
      const chainId = getChainIdFromChain(network);
      const walletAddress = req.headers["x-wallet-address"] as string;

      const smartWalletAddress = await createSmartWallet({
        chainId,
        signerAddress: walletAddress,
      });

      res.status(StatusCodes.OK).send({
        result: {
          walletAddress: smartWalletAddress,
        },
      });
    },
  });
};

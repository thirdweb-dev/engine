import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getWalletNonce } from "../../../db/wallets/getWalletNonce";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const requestSchema = walletParamSchema;

const responseSchema = Type.Object({
  result: Type.Object({
    status: Type.String(),
    nonce: Type.String(),
    walletAddress: Type.String(),
    chain: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    nonce: "100",
    walletAddress: "0x...",
    chain: "1",
  },
};

export const getBackendWalletNonce = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-nonces",
    schema: {
      summary: "Get backend-wallet nonces from DB",
      description:
        "Get nonce for a backend wallets from DB. This is for debugging purposes and does not impact held tokens.",
      tags: ["Backend Wallet"],
      operationId: "getNonces",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { chain, walletAddress } = req.params;
      const chainId = await getChainIdFromChain(chain);
      const walletNonce = await getWalletNonce({
        address: walletAddress,
        chainId,
      });

      if (!walletNonce) {
        throw createCustomError(
          `No wallet nonce found for ${walletAddress} in DB`,
          StatusCodes.NOT_FOUND,
          "NOT_FOUND",
        );
      }

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
          nonce: walletNonce?.nonce.toString() ?? "0",
          walletAddress,
          chain,
        },
      });
    },
  });
};

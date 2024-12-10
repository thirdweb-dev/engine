import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address } from "thirdweb";
import { inspectNonce } from "../../../shared/db/wallets/wallet-nonce";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletWithAddressParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const requestSchema = walletWithAddressParamSchema;

const responseSchema = Type.Object({
  result: Type.Object({
    nonce: Type.Integer(),
  }),
});

responseSchema.example = {
  result: {
    nonce: 100,
  },
};

export const getBackendWalletNonce = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-nonce",
    schema: {
      summary: "Get nonce",
      description:
        "Get the last used nonce for this backend wallet. This value managed by Engine may differ from the onchain value. Use `/backend-wallet/reset-nonces` if this value looks incorrect while idle.",
      tags: ["Backend Wallet"],
      operationId: "getNonce",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, reply) => {
      const { chain, walletAddress } = req.params;
      const chainId = await getChainIdFromChain(chain);
      const nonce = await inspectNonce(chainId, walletAddress as Address);

      reply.status(StatusCodes.OK).send({
        result: {
          nonce,
        },
      });
    },
  });
};

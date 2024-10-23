import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { syncLatestNonceFromOnchain } from "../../../db/wallets/walletNonce";
import { getChecksumAddress } from "../../../utils/primitiveTypes";
import {
  requestQuerystringSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import {
  walletHeaderSchema,
  walletWithAddressParamSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const responseSchema = Type.Object({
  result: Type.Object({
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    status: "success",
  },
};

export async function resetBackendWalletNonceRoute(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof walletWithAddressParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/reset-nonce",
    schema: {
      summary: "Reset nonce",
      description: "Reset the nonce for this backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "resetNonce",
      params: walletWithAddressParamSchema,
      headers: walletHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof walletHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);

      await syncLatestNonceFromOnchain(
        chainId,
        getChecksumAddress(walletAddress),
      );

      reply.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
}

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { isHex, type Hex } from "thirdweb";
import { arbitrumSepolia } from "thirdweb/chains";
import {
  getWalletDetails,
  isSmartBackendWallet,
} from "../../../shared/db/wallets/get-wallet-details.js";
import { walletDetailsToAccount } from "../../../shared/utils/account.js";
import { getChain } from "../../../shared/utils/chain.js";
import { createCustomError } from "../../middleware/error.js";
import { standardResponseSchema } from "../../schemas/shared-api-schemas.js";
import { walletHeaderSchema } from "../../schemas/wallet/index.js";

const requestBodySchema = Type.Object({
  message: Type.String(),
  isBytes: Type.Optional(Type.Boolean()),
  chainId: Type.Optional(Type.Number()),
});

const responseBodySchema = Type.Object({
  result: Type.String(),
});

export async function signMessageRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/sign-message",
    schema: {
      summary: "Sign a message",
      description: "Send a message",
      tags: ["Backend Wallet"],
      operationId: "signMessage",
      body: requestBodySchema,
      headers: walletHeaderSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { message, isBytes, chainId } = request.body;
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof walletHeaderSchema>;

      if (isBytes && !isHex(message)) {
        throw createCustomError(
          '"isBytes" is true but message is not hex.',
          StatusCodes.BAD_REQUEST,
          "INVALID_MESSAGE",
        );
      }

      const walletDetails = await getWalletDetails({
        address: walletAddress,
      });

      if (isSmartBackendWallet(walletDetails) && !chainId) {
        throw createCustomError(
          "Chain ID is required for signing messages with smart wallets.",
          StatusCodes.BAD_REQUEST,
          "CHAIN_ID_REQUIRED",
        );
      }

      const chain = chainId ? await getChain(chainId) : arbitrumSepolia;

      const { account } = await walletDetailsToAccount({
        walletDetails,
        chain,
      });

      const messageToSign = isBytes ? { raw: message as Hex } : message;
      const signedMessage = await account.signMessage({
        message: messageToSign,
      });

      reply.status(StatusCodes.OK).send({
        result: signedMessage,
      });
    },
  });
}

import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { arbitrumSepolia } from "thirdweb/chains";
import { isSmartBackendWallet } from "../../../shared/db/wallets/get-wallet-details";
import { getWalletDetails } from "../../../shared/db/wallets/get-wallet-details";
import { walletDetailsToAccount } from "../../../shared/utils/account";
import { getChain } from "../../../shared/utils/chain";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { walletHeaderSchema } from "../../schemas/wallet";

const requestBodySchema = Type.Object({
  domain: Type.Object({}, { additionalProperties: true }),
  types: Type.Object({}, { additionalProperties: true }),
  value: Type.Object({}, { additionalProperties: true }),
  primaryType: Type.Optional(Type.String()),
  chainId: Type.Optional(Type.Number()),
});

const responseBodySchema = Type.Object({
  result: Type.String(),
});

export async function signTypedData(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/sign-typed-data",
    schema: {
      summary: "Sign an EIP-712 message",
      description: 'Send an EIP-712 message ("typed data")',
      tags: ["Backend Wallet"],
      operationId: "signTypedData",
      body: requestBodySchema,
      headers: walletHeaderSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { domain, value, types, chainId, primaryType } = request.body;
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof walletHeaderSchema>;

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

      const result = await account.signTypedData({
        domain,
        types,
        primaryType,
        message: value,
      } as never);

      reply.status(StatusCodes.OK).send({
        result: result,
      });
    },
  });
}

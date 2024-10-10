import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { isHex, type Hex } from "thirdweb";
import { getAccount } from "../../../utils/account";
import { getChecksumAddress } from "../../../utils/primitiveTypes";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletHeaderSchema } from "../../schemas/wallet";

const requestBodySchema = Type.Object({
  message: Type.String(),
  isBytes: Type.Optional(Type.Boolean()),
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
      const { message, isBytes } = request.body;
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof walletHeaderSchema>;

      if (isBytes && !isHex(message)) {
        throw createCustomError(
          '"isBytes" is true but message is not hex.',
          StatusCodes.BAD_REQUEST,
          "INVALID_MESSAGE",
        );
      }

      const account = await getAccount({
        chainId: 1,
        from: getChecksumAddress(walletAddress),
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

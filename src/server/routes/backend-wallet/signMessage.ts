import { Static, Type } from "@sinclair/typebox";
import { ethers } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getWallet } from "../../../utils/cache/getWallet";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletHeaderSchema } from "../../schemas/wallet";

const requestBodySchema = Type.Object({
  message: Type.String(),
  isBytes: Type.Optional(Type.Boolean()),
});

const responseBodySchema = Type.Object({
  result: Type.String(),
});

export async function signMessage(fastify: FastifyInstance) {
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

      const wallet = await getWallet({
        chainId: 1,
        walletAddress,
      });

      const signer = await wallet.getSigner();

      let signedMessage;
      if (isBytes) {
        signedMessage = await signer.signMessage(
          ethers.utils.arrayify(message),
        );
      } else {
        signedMessage = await signer.signMessage(message);
      }

      reply.status(StatusCodes.OK).send({
        result: signedMessage,
      });
    },
  });
}

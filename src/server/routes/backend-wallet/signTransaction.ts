import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getWallet } from "../../../utils/cache/getWallet";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletHeaderSchema } from "../../schemas/wallet";

const requestBodySchema = Type.Object({
  transaction: Type.Object({
    to: Type.Optional(Type.String()),
    from: Type.Optional(Type.String()),
    nonce: Type.Optional(Type.String()),
    gasLimit: Type.Optional(Type.String()),
    gasPrice: Type.Optional(Type.String()),
    data: Type.Optional(Type.String()),
    value: Type.Optional(Type.String()),
    chainId: Type.Optional(Type.Number()),
    type: Type.Optional(Type.Number()),
    accessList: Type.Optional(Type.Any()),
    maxFeePerGas: Type.Optional(Type.String()),
    maxPriorityFeePerGas: Type.Optional(Type.String()),
    customData: Type.Optional(Type.Record(Type.String(), Type.Any())),
    ccipReadEnabled: Type.Optional(Type.Boolean()),
  }),
});

const responseBodySchema = Type.Object({
  result: Type.String(),
});

export async function signTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/sign-transaction",
    schema: {
      summary: "Sign a transaction",
      description: "Sign a transaction",
      tags: ["Backend Wallet"],
      operationId: "signTransaction",
      body: requestBodySchema,
      headers: walletHeaderSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { transaction } = request.body;
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof walletHeaderSchema>;

      const wallet = await getWallet({
        chainId: 1,
        walletAddress,
      });

      const signer = await wallet.getSigner();
      const signedMessage = await signer.signTransaction(transaction);

      reply.status(200).send({
        result: signedMessage,
      });
    },
  });
}

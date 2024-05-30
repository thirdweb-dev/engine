import type { TypedDataSigner } from "@ethersproject/abstract-signer";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getWallet } from "../../../utils/cache/getWallet";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { backendWalletHeaderSchema } from "../../schemas/wallet";

const requestBodySchema = Type.Object({
  domain: Type.Object({}, { additionalProperties: true }),
  types: Type.Object({}, { additionalProperties: true }),
  value: Type.Object({}, { additionalProperties: true }),
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
      headers: backendWalletHeaderSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { domain, value, types } = request.body;
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof backendWalletHeaderSchema>;

      const wallet = await getWallet({ chainId: 1, walletAddress });

      const signer = (await wallet.getSigner()) as unknown as TypedDataSigner;
      const result = await signer._signTypedData(domain, types, value);

      reply.status(200).send({
        result: result,
      });
    },
  });
}

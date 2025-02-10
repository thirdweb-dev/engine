import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { standardResponseSchema } from "../../schemas/shared-api-schemas.js";
import {
  requiredAddress,
  walletHeaderSchema,
} from "../../schemas/wallet/index.js";
import { getAccount } from "../../../shared/utils/account.js";

const requestBodySchema = Type.Object({
  domain: Type.Object({}, { additionalProperties: true }),
  types: Type.Object({}, { additionalProperties: true }),
  value: Type.Object({}, { additionalProperties: true }),
  message: Type.Optional(
    Type.Object(
      {},
      {
        additionalProperties: true,
        description:
          "The message to sign. Left optional for backwards compatibility, but recommended instead of value.",
      },
    ),
  ),
  primaryType: Type.Optional(
    Type.String({
      description:
        "The primary type of the message. Falls-back to the first type in the types object. Left optional for backwards compatibility, but highly recommended.",
    }),
  ),
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
      const { domain, value, types, message, primaryType } = request.body;
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof walletHeaderSchema>;

      const accountAddress = requiredAddress(
        walletAddress,
        "x-backend-wallet-address",
      );

      const account = await getAccount({ from: accountAddress, chainId: 1 });

      // @ts-ignore
      const result = await account.signTypedData({
        domain: domain,
        types: types,
        // @ts-ignore
        message: message ?? value,
        // @ts-ignore
        primaryType:
          primaryType ??
          Object.keys(types as Record<string, unknown>).find(
            (k) => k !== "EIP712Domain",
          ) ??
          Object.keys(types)[0],
      });

      reply.status(StatusCodes.OK).send({
        result: result,
      });
    },
  });
}

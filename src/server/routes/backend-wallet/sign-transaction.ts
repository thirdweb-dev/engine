import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Hex } from "thirdweb";
import { getAccount } from "../../../shared/utils/account";
import {
  getChecksumAddress,
  maybeBigInt,
  maybeInt,
} from "../../../shared/utils/primitive-types";
import { toTransactionType } from "../../../shared/utils/sdk";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { walletHeaderSchema } from "../../schemas/wallet";

const requestBodySchema = Type.Object({
  transaction: Type.Object({
    to: Type.Optional(Type.String()),
    nonce: Type.Optional(Type.String()),
    gasLimit: Type.Optional(Type.String()),
    gasPrice: Type.Optional(Type.String()),
    data: Type.Optional(Type.String()),
    value: Type.Optional(Type.String()),
    chainId: Type.Optional(Type.Integer()),
    type: Type.Optional(Type.Integer()),
    accessList: Type.Optional(Type.Any()),
    maxFeePerGas: Type.Optional(Type.String()),
    maxPriorityFeePerGas: Type.Optional(Type.String()),
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

      const account = await getAccount({
        chainId: 1,
        from: getChecksumAddress(walletAddress),
      });
      if (!account.signTransaction) {
        throw createCustomError(
          'This backend wallet does not support "signTransaction".',
          StatusCodes.BAD_REQUEST,
          "SIGN_TRANSACTION_UNIMPLEMENTED",
        );
      }

      // @TODO: Assert type to viem TransactionSerializable.
      const serializableTransaction: any = {
        chainId: transaction.chainId,
        to: getChecksumAddress(transaction.to),
        nonce: maybeInt(transaction.nonce),
        gas: maybeBigInt(transaction.gasLimit),
        gasPrice: maybeBigInt(transaction.gasPrice),
        data: transaction.data as Hex | undefined,
        value: maybeBigInt(transaction.value),
        type: transaction.type
          ? toTransactionType(transaction.type)
          : undefined,
        accessList: transaction.accessList,
        maxFeePerGas: maybeBigInt(transaction.maxFeePerGas),
        maxPriorityFeePerGas: maybeBigInt(transaction.maxPriorityFeePerGas),
        ccipReadEnabled: transaction.ccipReadEnabled,
      };
      const signature = await account.signTransaction(serializableTransaction);

      reply.status(StatusCodes.OK).send({
        result: signature,
      });
    },
  });
}

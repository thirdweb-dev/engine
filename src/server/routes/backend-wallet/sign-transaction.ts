import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAccount } from "../../../shared/utils/account";
import {
  getChecksumAddress,
  maybeBigInt,
} from "../../../shared/utils/primitive-types";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/shared-api-schemas";
import { walletHeaderSchema } from "../../schemas/wallet";
import {
  prepareTransaction,
  toSerializableTransaction,
  type Hex,
} from "thirdweb";
import { getChain } from "../../../shared/utils/chain";

const requestBodySchema = Type.Object({
  transaction: Type.Object({
    to: Type.Optional(Type.String()),
    nonce: Type.Optional(Type.String()),
    gasLimit: Type.Optional(Type.String()),
    gasPrice: Type.Optional(Type.String()),
    data: Type.Optional(Type.String()),
    value: Type.Optional(Type.String()),
    chainId: Type.Integer(),
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
      const { "x-backend-wallet-address": walletAddress } =
        request.headers as Static<typeof walletHeaderSchema>;

      const { chainId, nonce, ...transaction } = request.body.transaction;
      const chain = await getChain(chainId);

      const account = await getAccount({
        chainId,
        from: getChecksumAddress(walletAddress),
      });

      if (!account.signTransaction) {
        throw createCustomError(
          'This backend wallet does not support "signTransaction".',
          StatusCodes.BAD_REQUEST,
          "SIGN_TRANSACTION_UNIMPLEMENTED",
        );
      }

      // const prepareTransactionOptions: StaticPrepareTransactionOptions
      const prepareTransactionOptions = {
        ...transaction,
        data: transaction.data as Hex | undefined,
        client: thirdwebClient,
        nonce: nonce ? Number.parseInt(nonce) : undefined,
        chain,
        value: maybeBigInt(transaction.value),
        gas: maybeBigInt(transaction.gasLimit),
        gasPrice: maybeBigInt(transaction.gasPrice),
        maxFeePerGas: maybeBigInt(transaction.maxFeePerGas),
        maxPriorityFeePerGas: maybeBigInt(transaction.maxPriorityFeePerGas),
      };

      const preparedTransaction = prepareTransaction(prepareTransactionOptions);
      const serializableTransaction = await toSerializableTransaction({
        transaction: preparedTransaction,
      });

      const signature = await account.signTransaction(serializableTransaction);

      reply.status(StatusCodes.OK).send({
        result: signature,
      });
    },
  });
}

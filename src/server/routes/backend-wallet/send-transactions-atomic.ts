import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address, Hex } from "thirdweb";
import { insertTransaction } from "../../../shared/utils/transaction/insert-transaction";
import { AddressSchema } from "../../schemas/address";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/shared-api-schemas";
import {
  maybeAddress,
  walletChainParamSchema,
  walletWithAAHeaderSchema,
} from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import {
  getWalletDetails,
  isSmartBackendWallet,
  type ParsedWalletDetails,
  WalletDetailsError,
} from "../../../shared/db/wallets/get-wallet-details";
import { createCustomError } from "../../middleware/error";

const requestBodySchema = Type.Object({
  transactions: Type.Array(
    Type.Object({
      toAddress: Type.Optional(AddressSchema),
      data: Type.String({
        examples: ["0x..."],
      }),
      value: Type.String({
        examples: ["10000000"],
      }),
    }),
  ),
});

export async function sendTransactionsAtomicRoute(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof walletChainParamSchema>;
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/send-transactions-atomic",
    schema: {
      summary: "Send a batch of raw transactions atomically",
      description:
        "Send a batch of raw transactions in a single UserOp. Can only be used with smart wallets.",
      tags: ["Backend Wallet"],
      operationId: "sendTransactionsAtomic",
      params: walletChainParamSchema,
      body: requestBodySchema,
      headers: Type.Omit(walletWithAAHeaderSchema, ["x-transaction-mode"]),
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-address": accountAddress,
        "x-account-factory-address": accountFactoryAddress,
        "x-account-salt": accountSalt,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const chainId = await getChainIdFromChain(chain);
      const shouldSimulate = request.query.simulateTx ?? false;
      const transactionRequests = request.body.transactions;

      const hasSmartHeaders = !!accountAddress;

      // check that we either use SBW, or send using EOA with smart wallet headers
      if (!hasSmartHeaders) {
        let backendWallet: ParsedWalletDetails | undefined;

        try {
          backendWallet = await getWalletDetails({
            address: fromAddress,
          });
        } catch (e: unknown) {
          if (e instanceof WalletDetailsError) {
            throw createCustomError(
              `Failed to get wallet details for backend wallet ${fromAddress}. ${e.message}`,
              StatusCodes.BAD_REQUEST,
              "WALLET_DETAILS_ERROR",
            );
          }
        }

        if (!backendWallet) {
          throw createCustomError(
            "Failed to get wallet details for backend wallet. See: https://portal.thirdweb.com/engine/troubleshooting",
            StatusCodes.INTERNAL_SERVER_ERROR,
            "WALLET_DETAILS_ERROR",
          );
        }

        if (!isSmartBackendWallet(backendWallet)) {
          throw createCustomError(
            "Backend wallet is not a smart wallet, and x-account-address is not provided. Either use a smart backend wallet or provide x-account-address. This endpoint can only be used with smart wallets.",
            StatusCodes.BAD_REQUEST,
            "BACKEND_WALLET_NOT_SMART",
          );
        }
      }

      if (transactionRequests.length === 0) {
        throw createCustomError(
          "No transactions provided",
          StatusCodes.BAD_REQUEST,
          "NO_TRANSACTIONS_PROVIDED",
        );
      }

      const queueId = await insertTransaction({
        insertedTransaction: {
          transactionMode: undefined,
          isUserOp: false,
          chainId,
          from: fromAddress as Address,
          accountAddress: maybeAddress(accountAddress, "x-account-address"),
          accountFactoryAddress: maybeAddress(
            accountFactoryAddress,
            "x-account-factory-address",
          ),
          accountSalt: accountSalt,
          batchOperations: transactionRequests.map((transactionRequest) => ({
            to: transactionRequest.toAddress as Address | undefined,
            data: transactionRequest.data as Hex,
            value: BigInt(transactionRequest.value),
          })),
        },
        shouldSimulate,
        idempotencyKey,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}

import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../shared/db/transactions/db.js";
import { getNonceMap } from "../../../shared/db/wallets/nonce-map.js";
import { normalizeAddress } from "../../../shared/utils/primitive-types.js";
import type { AnyTransaction } from "../../../shared/utils/transaction/types.js";
import { standardResponseSchema } from "../../schemas/shared-api-schemas.js";
import {
  TransactionSchema,
  toTransactionSchema,
} from "../../schemas/transaction/index.js";
import { walletWithAddressParamSchema } from "../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../utils/chain.js";

const requestParamsSchema = walletWithAddressParamSchema;

const requestQuerySchema = Type.Object({
  fromNonce: Type.Integer({
    description: "The earliest nonce, inclusive.",
    examples: [100],
    minimum: 0,
  }),
  toNonce: Type.Optional(
    Type.Integer({
      description:
        "The latest nonce, inclusive. If omitted, queries up to the latest sent nonce.",
      examples: [100],
      minimum: 0,
    }),
  ),
});

const responseBodySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      nonce: Type.Integer(),
      // Returns the transaction details by default.
      // Falls back to the queueId if the transaction details have been pruned.
      transaction: Type.Union([TransactionSchema, Type.String()]),
    }),
  ),
});

export async function getTransactionsForBackendWalletByNonce(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Querystring: Static<typeof requestQuerySchema>;
    Params: Static<typeof requestParamsSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-transactions-by-nonce",
    schema: {
      summary: "Get recent transactions by nonce",
      description:
        "Get recent transactions for this backend wallet, sorted by descending nonce.",
      tags: ["Backend Wallet"],
      operationId: "getTransactionsForBackendWalletByNonce",
      querystring: requestQuerySchema,
      params: requestParamsSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { chain, walletAddress: _walletAddress } = req.params;
      const { fromNonce, toNonce } = req.query;
      const chainId = await getChainIdFromChain(chain);
      const walletAddress = normalizeAddress(_walletAddress);

      // Get queueIds.
      const nonceMap = await getNonceMap({
        chainId,
        walletAddress,
        fromNonce,
        toNonce,
      });

      // Build map of { queueId => transaction }.
      const queueIds = nonceMap.map(({ queueId }) => queueId);
      const transactions = await TransactionDB.bulkGet(queueIds);
      const transactionsMap = new Map<string, AnyTransaction>();
      for (const transaction of transactions) {
        transactionsMap.set(transaction.queueId, transaction);
      }

      // Hydrate the transaction, if found.
      const result = nonceMap.map(({ nonce, queueId }) => {
        const transaction = transactionsMap.get(queueId);
        return {
          nonce,
          transaction: transaction ? toTransactionSchema(transaction) : queueId,
        };
      });

      res.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}

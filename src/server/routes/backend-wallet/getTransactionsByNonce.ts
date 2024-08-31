import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../db/transactions/db";
import { getNonceMap } from "../../../db/wallets/nonceMap";
import { normalizeAddress } from "../../../utils/primitiveTypes";
import { AnyTransaction } from "../../../utils/transaction/types";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  TransactionSchema,
  toTransactionSchema,
} from "../../schemas/transaction";
import { walletWithAddressParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const requestQuerySchema = Type.Object({
  ...walletWithAddressParamSchema.properties,
  fromNonce: Type.Integer({
    description: "The earliest nonce, inclusive.",
    examples: [100],
    minimum: 0,
  }),
  toNonce: Type.Integer({
    description: "The latest nonce, inclusive.",
    examples: [100],
    minimum: 0,
  }),
});

const responseBodySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      nonce: Type.Number(),
      // Returns the transaction details by default.
      // Falls back to the queueId if the transaction details have been pruned.
      transaction: Type.Union([TransactionSchema, Type.String()]),
    }),
  ),
});

export async function getTransactionsByNonce(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestQuerySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-transactions-by-nonce",
    schema: {
      summary: "Get recent transactions by nonce",
      description:
        "Get recent transactions for this backend wallet, sorted by descending nonce.",
      tags: ["Backend Wallet"],
      operationId: "getTransactionsByNonceForBackendWallet",
      params: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const {
        chain,
        walletAddress: _walletAddress,
        fromNonce,
        toNonce,
      } = req.params;
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

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../db/transactions/db";
import { env } from "../../../utils/env";
import { normalizeAddress } from "../../../utils/primitiveTypes";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  TransactionSchema,
  toTransactionSchema,
} from "../../schemas/transaction";
import { walletWithAddressParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = walletWithAddressParamSchema;

const responseBodySchema = Type.Object({
  result: Type.Object({
    transactions: Type.Array(TransactionSchema),
  }),
});

export async function getAllTransactions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-all-transactions",
    schema: {
      summary: "Get all transactions",
      description: "Get all transactions for a backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "getAllTransactions",
      params: ParamsSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { chain, walletAddress: _walletAddress } = req.params;
      const chainId = await getChainIdFromChain(chain);
      const walletAddress = normalizeAddress(_walletAddress);

      const { transactions } = await TransactionDB.getTransactionListByStatus({
        status: "queued",
        page: 1,
        limit: env.TRANSACTION_HISTORY_COUNT,
      });
      const filtered = transactions.filter(
        (t) => t.chainId === chainId && t.from === walletAddress,
      );

      res.status(StatusCodes.OK).send({
        result: {
          transactions: filtered.map(toTransactionSchema),
        },
      });
    },
  });
}

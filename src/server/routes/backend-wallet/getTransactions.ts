import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAddress } from "thirdweb";
import { TransactionDB } from "../../../db/transactions/db";
import { PaginationSchema } from "../../schemas/pagination";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  TransactionSchema,
  toTransactionSchema,
} from "../../schemas/transaction";
import { walletWithAddressParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const requestParamsSchema = walletWithAddressParamSchema;

const requestQuerySchema = Type.Object({
  ...PaginationSchema.properties,
  status: Type.Union(
    [
      // Note: 'queued' returns all transcations, not just transactions currently queued.
      Type.Literal("queued"),
      Type.Literal("mined"),
      Type.Literal("cancelled"),
      Type.Literal("errored"),
    ],
    {
      description:
        "The status to query: 'queued', 'mined', 'errored', or 'cancelled'. Default: 'queued'",
      default: "queued",
    },
  ),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    transactions: Type.Array(TransactionSchema),
  }),
});

export async function getTransactionsForBackendWallet(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Querystring: Static<typeof requestQuerySchema>;
    Params: Static<typeof requestParamsSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-all-transactions",
    schema: {
      summary: "Get recent transactions",
      description: "Get recent transactions for this backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "getTransactionsForBackendWallet",
      querystring: requestQuerySchema,
      params: requestParamsSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { chain, walletAddress: _walletAddress } = req.params;
      const { page, limit, status } = req.query;
      const chainId = await getChainIdFromChain(chain);
      const walletAddress = getAddress(_walletAddress);

      const { transactions } = await TransactionDB.getTransactionListByStatus({
        status,
        page,
        limit,
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

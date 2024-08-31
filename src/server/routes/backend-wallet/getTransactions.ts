import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../db/transactions/db";
import { normalizeAddress } from "../../../utils/primitiveTypes";
import { PaginationSchema } from "../../schemas/pagination";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  TransactionSchema,
  toTransactionSchema,
} from "../../schemas/transaction";
import { walletWithAddressParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const requestQuerySchema = Type.Object({
  ...walletWithAddressParamSchema.properties,
  ...PaginationSchema.properties,
  status: Type.Union(
    [
      Type.Literal("queued"),
      Type.Literal("mined"),
      Type.Literal("cancelled"),
      Type.Literal("errored"),
    ],
    {
      description:
        "The status to query: 'queued', 'mined', 'errored', or 'cancelled'. Default: 'queued'",
      // DEBUG: test this is optional
      default: "queued",
    },
  ),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    transactions: Type.Array(TransactionSchema),
  }),
});

export async function getTransactionsByBackendWallet(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestQuerySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-all-transactions",
    schema: {
      summary: "Get recent transactions",
      description: "Get recent transactions for this backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "getTransactionsForBackendWallet",
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
        page,
        limit,
        status,
      } = req.params;
      const chainId = await getChainIdFromChain(chain);
      const walletAddress = normalizeAddress(_walletAddress);

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

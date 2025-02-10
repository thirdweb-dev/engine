import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../shared/db/transactions/db.js";
import { PaginationSchema } from "../../schemas/pagination.js";
import { standardResponseSchema } from "../../schemas/shared-api-schemas.js";
import {
  TransactionSchema,
  toTransactionSchema,
} from "../../schemas/transaction/index.js";

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
    totalCount: Type.Integer(),
  }),
});

responseBodySchema.example = {
  result: {
    transactions: [
      {
        queueId: "3bb66998-4c99-436c-9753-9dc931214a9b",
        chainId: "80001",
        fromAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
        toAddress: "0x365b83d67d5539c6583b9c0266a548926bf216f4",
        data: "0xa9059cbb0000000000000000000000003ecdbf3b911d0e9052b64850693888b008e183730000000000000000000000000000000000000000000000000000000000000064",
        extension: "none",
        value: "0x00",
        nonce: 1758,
        gasLimit: "39580",
        gasPrice: "2008818932",
        maxFeePerGas: "2209700838",
        maxPriorityFeePerGas: "2008818916",
        transactionType: 2,
        transactionHash:
          "0xf11ca950299c9e72b8d6cac8a03623c6e5a43af1d1b0d45b3fd804c129b573f8",
        queuedAt: "2023-09-29T18:17:36.929Z",
        sentAt: "2023-09-29T18:17:40.832Z",
        minedAt: "2023-09-29T18:17:44.000Z",
        cancelledAt: null,
        deployedContractAddress: null,
        deployedContractType: null,
        errorMessage: null,
        sentAtBlockNumber: 40653754,
        blockNumber: 40653756,
        status: "mined",
        retryCount: 0,
        retryGasValues: false,
        retryMaxFeePerGas: null,
        retryMaxPriorityFeePerGas: null,
        signerAddress: null,
        accountAddress: null,
        target: null,
        sender: null,
        initCode: null,
        callData: null,
        callGasLimit: null,
        verificationGasLimit: null,
        preVerificationGas: null,
        paymasterAndData: null,
        userOpHash: null,
        functionName: "transfer",
        functionArgs: "0x3ecdbf3b911d0e9052b64850693888b008e18373,100",
      },
    ],
    totalCount: 1,
  },
};

export async function getAllTransactions(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof requestQuerySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/get-all",
    schema: {
      summary: "Get all transactions",
      description: "Get all transaction requests.",
      tags: ["Transaction"],
      operationId: "listTransactions",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { status, page, limit } = request.query;

      const { transactions, totalCount } =
        await TransactionDB.getTransactionListByStatus({
          status,
          page,
          limit,
        });

      reply.status(StatusCodes.OK).send({
        result: {
          transactions: transactions.map(toTransactionSchema),
          totalCount,
        },
      });
    },
  });
}

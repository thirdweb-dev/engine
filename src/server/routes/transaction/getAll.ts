import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllTxs } from "../../../db/transactions/getAllTxs";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  TransactionStatusEnum,
  transactionResponseSchema,
} from "../../schemas/transaction";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

// INPUT
const requestQuerySchema = Type.Object({
  page: Type.Integer({
    description: "The page number for paginated results",
    examples: [1],
    default: 1,
    minimum: 1,
  }),
  limit: Type.Integer({
    description: "The number of transactions to return per page.",
    examples: [10],
    default: 10,
    minimum: 1,
  }),
  status: Type.Optional(
    Type.Enum(TransactionStatusEnum, {
      description:
        "Filters transactions by status. Defaults to returning all transactions.",
      examples: Object.values(TransactionStatusEnum),
    }),
  ),
  fromQueuedAt: Type.Optional(
    Type.Unsafe<string>({ type: "string", format: "date-time" }),
  ),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Object({
    transactions: Type.Array(transactionResponseSchema),
    totalCount: Type.Number(),
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
        processedAt: "2023-09-29T18:17:37.011Z",
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

export async function getAllTx(fastify: FastifyInstance) {
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
      operationId: "getAll",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const {
        page,
        limit,
        status,
        fromQueuedAt: fromQueuedAtString,
      } = request.query;

      let fromQueuedAt: Date | undefined;
      if (fromQueuedAtString) {
        fromQueuedAt = new Date(fromQueuedAtString);
        const diffMs = new Date().getTime() - fromQueuedAt.getTime();
        if (diffMs > ONE_DAY_IN_MS) {
          throw createCustomError(
            "fromQueuedAt date must be within 24 hours",
            StatusCodes.BAD_REQUEST,
            "BAD_REQUEST",
          );
        }
      }

      const { transactions, totalCount } = await getAllTxs({
        page,
        limit,
        status,
        fromQueuedAt,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          transactions,
          totalCount,
        },
      });
    },
  });
}

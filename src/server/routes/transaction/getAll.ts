import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllTxs } from "../../../db/transactions/getAllTxs";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  toTransactionResponse,
  transactionResponseSchema,
} from "../../schemas/transaction";

// INPUT
const requestQuerySchema = Type.Object({
  page: Type.String({
    description:
      "This parameter allows the user to specify the page number for pagination purposes",
    examples: ["1"],
    default: "1",
  }),
  limit: Type.String({
    description:
      "This parameter defines the maximum number of transaction request data to return per page.",
    examples: ["10"],
    default: "10",
  }),
  // filter: Type.Optional(
  //   Type.Union([Type.Enum(TransactionStatus), Type.Literal("all")], {
  //     description:
  //       "This parameter allows to define specific criteria to filter the data by. For example, filtering by processed, submitted or error",
  //     examples: ["all", "submitted", "processed", "errored", "mined", "queued"],
  //     default: "all",
  //   }),
  // ),
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
        value: "0",
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
      const { page, limit } = request.query;

      if (isNaN(parseInt(page, 10))) {
        const customError = createCustomError(
          "Page must be a number",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
        throw customError;
      } else if (isNaN(parseInt(limit, 10))) {
        const customError = createCustomError(
          "Limit must be a number",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
        throw customError;
      }

      const { transactions, totalCount } = await getAllTxs({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        // filter: filter && filter !== "all" ? filter : undefined, // TODO: To bring this back for Paid feature
      });

      reply.status(StatusCodes.OK).send({
        result: {
          transactions: transactions.map(toTransactionResponse),
          totalCount,
        },
      });
    },
  });
}

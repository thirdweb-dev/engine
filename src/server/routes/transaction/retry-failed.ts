import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { eth_getTransactionReceipt, getRpcClient } from "thirdweb";
import { TransactionDB } from "../../../db/transactions/db";
import { getChain } from "../../../utils/chain";
import { thirdwebClient } from "../../../utils/sdk";
import { SendTransactionQueue } from "../../../worker/queues/sendTransactionQueue";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

export const responseBodySchema = Type.Object({
  result: Type.Object({
    message: Type.String(),
    status: Type.String(),
  }),
});

responseBodySchema.example = {
  result: {
    message:
      "Transaction queued for retry with queueId: a20ed4ce-301d-4251-a7af-86bd88f6c015",
    status: "success",
  },
};

export async function retryFailedTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/retry-failed",
    schema: {
      summary: "Retry failed transaction",
      description: "Retry a failed transaction",
      tags: ["Transaction"],
      operationId: "retry",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
      deprecated: true,
      hide: true,
    },
    handler: async (request, reply) => {
      const { queueId } = request.body;

      const transaction = await TransactionDB.get(queueId);
      if (!transaction) {
        throw createCustomError(
          "Transaction not found.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_NOT_FOUND",
        );
      }
      if (transaction.status !== "errored") {
        throw createCustomError(
          `Transaction cannot be retried because status: ${transaction.status}`,
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      // temp do not handle userop
      if (transaction.isUserOp) {
        throw createCustomError(
          `Transaction cannot be retried because it is a userop`,
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      const rpcRequest = getRpcClient({
        client: thirdwebClient,
        chain: await getChain(transaction.chainId),
      });

      if (!("sentTransactionHashes" in transaction))
        throw createCustomError(
          `Transaction cannot be retried because it was never sent`,
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );

      const receiptPromises = transaction.sentTransactionHashes.map((hash) => {
        // if receipt is not found, it will throw an error
        // so we catch it and return null
        try {
          return eth_getTransactionReceipt(rpcRequest, {
            hash,
          });
        } catch {
          return null;
        }
      });

      const receipts = await Promise.all(receiptPromises);

      // If any of the transactions are mined, we should not retry.
      const minedReceipt = receipts.find((receipt) => !!receipt);

      if (minedReceipt) {
        throw createCustomError(
          `Transaction cannot be retried because it has already been mined with hash: ${minedReceipt.transactionHash}`,
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      // how do we keep a record of the fact that this is manually retried?
      await SendTransactionQueue.add({
        queueId: transaction.queueId,
        resendCount: 0,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          message: `Transaction queued for retry with queueId: ${queueId}`,
          status: "success",
        },
      });
    },
  });
}

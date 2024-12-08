import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../shared/db/transactions/db";
import {
  getReceiptForEOATransaction,
  getReceiptForUserOp,
} from "../../../shared/lib/transaction/get-transaction-receipt";
import type { QueuedTransaction } from "../../../shared/utils/transaction/types";
import { MineTransactionQueue } from "../../../worker/queues/mineTransactionQueue";
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
    message: "Sent transaction to be retried.",
    status: "success",
  },
};

export async function retryFailedTransactionRoute(fastify: FastifyInstance) {
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
      operationId: "retryFailed",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
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
          `Cannot retry a transaction with status ${transaction.status}.`,
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      const receipt = transaction.isUserOp
        ? await getReceiptForUserOp(transaction)
        : await getReceiptForEOATransaction(transaction);
      if (receipt) {
        throw createCustomError(
          "Cannot retry a transaction that is already mined.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      // Remove existing jobs.
      const sendJob = await SendTransactionQueue.q.getJob(
        SendTransactionQueue.jobId({
          queueId: transaction.queueId,
          resendCount: 0,
        }),
      );
      await sendJob?.remove();

      const mineJob = await MineTransactionQueue.q.getJob(
        MineTransactionQueue.jobId({
          queueId: transaction.queueId,
        }),
      );
      await mineJob?.remove();

      // Reset the failed job as "queued" and re-enqueue it.
      const { errorMessage, ...omitted } = transaction;
      const queuedTransaction: QueuedTransaction = {
        ...omitted,
        status: "queued",
        queuedAt: new Date(),
        resendCount: 0,
      };
      await TransactionDB.set(queuedTransaction);

      await SendTransactionQueue.add({
        queueId: transaction.queueId,
        resendCount: 0,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          message: "Sent transaction to be retried.",
          status: "success",
        },
      });
    },
  });
}

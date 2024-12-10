import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../shared/db/transactions/db";
import { maybeBigInt } from "../../../shared/utils/primitive-types";
import type { SentTransaction } from "../../../shared/utils/transaction/types";
import { SendTransactionQueue } from "../../../worker/queues/send-transaction-queue";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
  maxFeePerGas: Type.String(),
  maxPriorityFeePerGas: Type.String(),
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
      "Transaction gas values updated for queueId: a20ed4ce-301d-4251-a7af-86bd88f6c015",
    status: "success",
  },
};

export async function retryTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/retry",
    schema: {
      summary: "Retry transaction",
      description: "Retry a transaction with updated gas settings.",
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
      const { queueId, maxFeePerGas, maxPriorityFeePerGas } = request.body;

      const transaction = await TransactionDB.get(queueId);
      if (!transaction) {
        throw createCustomError(
          "Transaction not found.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_NOT_FOUND",
        );
      }
      if (transaction.status !== "sent") {
        throw createCustomError(
          "Transaction cannot be retried.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      // Override the gas settings.
      const sentTransaction: SentTransaction = {
        ...transaction,
        maxFeePerGas: maybeBigInt(maxFeePerGas),
        maxPriorityFeePerGas: maybeBigInt(maxPriorityFeePerGas),
      };
      await TransactionDB.set(sentTransaction);
      await SendTransactionQueue.add({
        queueId: sentTransaction.queueId,
        resendCount: sentTransaction.resendCount + 1,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          message: `Transaction gas values updated for queueId: ${queueId}`,
          status: "success",
        },
      });
    },
  });
}

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { defineChain } from "thirdweb";
import { TransactionDB } from "../../../db/transactions/db";
import { msSince } from "../../../utils/date";
import {
  QueuedTransaction,
  SentTransaction,
} from "../../../utils/transaction/types";
import { reportUsage } from "../../../utils/usage";
import {
  populateTransaction,
  sendPopulatedTransaction,
} from "../../../worker/tasks/sendTransactionWorker";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

// INPUT
const requestBodySchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
  maxFeePerGas: Type.Optional(Type.String()),
  maxPriorityFeePerGas: Type.Optional(Type.String()),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Object({
    transactionHash: Type.String(),
  }),
});

responseBodySchema.example = {
  result: {
    transactionHash:
      "0xc3b437073c164c33f95065fb325e9bc419f306cb39ae8b4ca233f33efaa74ead",
  },
};

export async function syncRetryTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/sync-retry",
    schema: {
      summary: "Retry transaction (synchronous)",
      description:
        "Synchronously retry a transaction with updated gas settings.",
      tags: ["Transaction"],
      operationId: "syncRetry",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
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

      const preparedTransaction: QueuedTransaction = {
        ...transaction,
        status: "queued",
        maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
        maxPriorityFeePerGas: maxPriorityFeePerGas
          ? BigInt(maxPriorityFeePerGas)
          : undefined,
      };

      const populatedTransaction = await populateTransaction(
        preparedTransaction,
      );
      const { transactionHash } = await sendPopulatedTransaction({
        preparedTransaction,
        populatedTransaction,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          transactionHash,
        },
      });
    },
  });
}

const _reportUsageSuccess = (sentTransaction: SentTransaction) => {
  const chain = defineChain(sentTransaction.chainId);
  reportUsage([
    {
      action: "send_tx",
      input: {
        ...sentTransaction,
        provider: chain.rpc,
        msSinceQueue: msSince(sentTransaction.queuedAt),
      },
    },
  ]);
};

import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { defineChain } from "thirdweb";
import { TransactionDB } from "../../../db/transactions/db";
import { getAccount } from "../../../utils/account";
import { getBlockNumberish } from "../../../utils/block";
import { msSince } from "../../../utils/date";
import { SentTransaction } from "../../../utils/transaction/types";
import { enqueueTransactionWebhook } from "../../../utils/transaction/webhook";
import { reportUsage } from "../../../utils/usage";
import { enqueueConfirmTransaction } from "../../../worker/queues/confirmTransactionQueue";
import { _populateTransaction } from "../../../worker/tasks/sendTransactionWorker";
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
        // Cannot retry a transaction that has not been sent or already completed.
        throw createCustomError(
          "Transaction cannot be retried.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      const { chainId, from } = transaction;
      const populatedTransaction = await _populateTransaction({
        ...transaction,
        maxFeePerGas: maxFeePerGas ? BigInt(maxFeePerGas) : undefined,
        maxPriorityFeePerGas: maxPriorityFeePerGas
          ? BigInt(maxPriorityFeePerGas)
          : undefined,
      });

      // Send the transaction.
      const account = await getAccount({ chainId, from });
      const { transactionHash } = await account.sendTransaction(
        populatedTransaction,
      );

      // Enqueue a ConfirmTransaction job.
      console.log(
        `Transaction sent with hash ${transactionHash}. Confirming transaction...`,
      );
      const sentTransaction: SentTransaction = {
        ...transaction,
        sentAt: new Date(),
        sentAtBlock: await getBlockNumberish(chainId),
        transactionHash,
      };
      await TransactionDB.set(sentTransaction);
      await enqueueConfirmTransaction({ sentTransaction });
      await enqueueTransactionWebhook(sentTransaction);
      _reportUsageSuccess(sentTransaction);

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

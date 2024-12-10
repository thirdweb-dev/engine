import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../shared/db/transactions/db";
import { getBlockNumberish } from "../../../shared/utils/block";
import { getConfig } from "../../../shared/utils/cache/get-config";
import { getChain } from "../../../shared/utils/chain";
import { msSince } from "../../../shared/utils/date";
import { sendCancellationTransaction } from "../../../shared/utils/transaction/cancel-transaction";
import type { CancelledTransaction } from "../../../shared/utils/transaction/types";
import { enqueueTransactionWebhook } from "../../../shared/utils/transaction/webhook";
import { reportUsage } from "../../../shared/utils/usage";
import { SendTransactionQueue } from "../../../worker/queues/send-transaction-queue";
import { createCustomError } from "../../middleware/error";
import { TransactionHashSchema } from "../../schemas/address";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

// INPUT
const requestBodySchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Object({
    queueId: Type.String({
      description: "Transaction queue ID",
      examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
    }),
    status: Type.String({
      description: "Response status",
      examples: ["success, error"],
    }),
    message: Type.String({
      description: "Response message",
      examples: ["Transaction cancelled on-chain successfully"],
    }),
    transactionHash: Type.Optional(TransactionHashSchema),
  }),
});

responseBodySchema.example = {
  result: {
    queueId: "a20ed4ce-301d-4251-a7af-86bd88f6c015",
    status: "success",
  },
};

export async function cancelTransaction(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/cancel",
    schema: {
      summary: "Cancel transaction",
      description:
        "Attempt to cancel a transaction by sending a null transaction with a higher gas setting. This transaction is not guaranteed to be cancelled.",
      tags: ["Transaction"],
      operationId: "cancel",
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

      let message = "Transaction successfully cancelled.";
      let cancelledTransaction: CancelledTransaction | null = null;
      if (!transaction.isUserOp) {
        if (transaction.status === "queued") {
          // Remove all retries from the SEND_TRANSACTION queue.
          const config = await getConfig();
          for (
            let resendCount = 0;
            resendCount < config.maxRetriesPerTx;
            resendCount++
          ) {
            await SendTransactionQueue.remove({ queueId, resendCount });
          }

          cancelledTransaction = {
            ...transaction,
            status: "cancelled",
            cancelledAt: new Date(),

            // Dummy data since the transaction was never sent.
            sentAt: new Date(),
            sentAtBlock: await getBlockNumberish(transaction.chainId),

            isUserOp: false,
            gas: 0n,
            nonce: -1,
            sentTransactionHashes: [],
          };
        } else if (transaction.status === "sent") {
          // Cancel a sent transaction with the same nonce.
          const { chainId, from, nonce } = transaction;
          const transactionHash = await sendCancellationTransaction({
            chainId,
            from,
            nonce,
          });
          cancelledTransaction = {
            ...transaction,
            status: "cancelled",
            cancelledAt: new Date(),
            sentTransactionHashes: [transactionHash],
          };
        }
      }

      if (!cancelledTransaction) {
        throw createCustomError(
          "Transaction cannot be cancelled.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_CANCELLED",
        );
      }

      // A queued or sent transaction was successfully cancelled.
      await TransactionDB.set(cancelledTransaction);
      await enqueueTransactionWebhook(cancelledTransaction);
      await _reportUsageSuccess(cancelledTransaction);

      return reply.status(StatusCodes.OK).send({
        result: {
          queueId,
          status: "success",
          message,
          transactionHash: cancelledTransaction.sentTransactionHashes.at(-1),
        },
      });
    },
  });
}

const _reportUsageSuccess = async (
  cancelledTransaction: CancelledTransaction,
) => {
  const chain = await getChain(cancelledTransaction.chainId);
  reportUsage([
    {
      action: "cancel_tx",
      input: {
        ...cancelledTransaction,
        provider: chain.rpc,
        msSinceQueue: msSince(cancelledTransaction.queuedAt),
        msSinceSend: msSince(cancelledTransaction.sentAt),
      },
    },
  ]);
};

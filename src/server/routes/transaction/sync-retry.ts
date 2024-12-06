import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { toSerializableTransaction } from "thirdweb";
import { TransactionDB } from "../../../db/transactions/db";
import { getReceiptForEOATransaction } from "../../../lib/transaction/get-transaction-receipt";
import { getAccount } from "../../../utils/account";
import { getBlockNumberish } from "../../../utils/block";
import { getChain } from "../../../utils/chain";
import { getChecksumAddress, maybeBigInt } from "../../../utils/primitiveTypes";
import { thirdwebClient } from "../../../utils/sdk";
import type { SentTransaction } from "../../../utils/transaction/types";
import { enqueueTransactionWebhook } from "../../../utils/transaction/webhook";
import { MineTransactionQueue } from "../../../worker/queues/mineTransactionQueue";
import { createCustomError } from "../../middleware/error";
import { TransactionHashSchema } from "../../schemas/address";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
  maxFeePerGas: Type.Optional(Type.String()),
  maxPriorityFeePerGas: Type.Optional(Type.String()),
});

export const responseBodySchema = Type.Object({
  result: Type.Object({
    transactionHash: TransactionHashSchema,
  }),
});

responseBodySchema.example = {
  result: {
    transactionHash:
      "0xc3b437073c164c33f95065fb325e9bc419f306cb39ae8b4ca233f33efaa74ead",
  },
};

export async function syncRetryTransactionRoute(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/transaction/sync-retry",
    schema: {
      summary: "Retry transaction (synchronous)",
      description:
        "Retry a transaction with updated gas settings. Blocks until the transaction is mined or errors.",
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

      if (transaction.isUserOp || !("nonce" in transaction)) {
        throw createCustomError(
          "Transaction cannot be retried.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      const receipt = await getReceiptForEOATransaction(transaction);
      if (receipt) {
        throw createCustomError(
          "Cannot retry a transaction that is already mined.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      const { chainId, from } = transaction;

      // Prepare transaction.
      const populatedTransaction = await toSerializableTransaction({
        from: getChecksumAddress(from),
        transaction: {
          client: thirdwebClient,
          chain: await getChain(chainId),
          ...transaction,
          // Explicitly reuse the same nonce the transaction had previously acquired.
          nonce: transaction.nonce,
          maxFeePerGas: maybeBigInt(maxFeePerGas),
          maxPriorityFeePerGas: maybeBigInt(maxPriorityFeePerGas),
        },
      });

      // Send transaction.
      const account = await getAccount({ chainId, from });
      const { transactionHash } =
        await account.sendTransaction(populatedTransaction);

      // Update state if the send was successful.
      const sentTransaction: SentTransaction = {
        ...transaction,
        status: "sent",
        resendCount: transaction.resendCount + 1,
        sentAt: new Date(),
        sentAtBlock: await getBlockNumberish(chainId),
        sentTransactionHashes: [
          ...transaction.sentTransactionHashes,
          transactionHash,
        ],
        gas: populatedTransaction.gas,
        gasPrice: populatedTransaction.gasPrice,
        maxFeePerGas: populatedTransaction.maxFeePerGas,
        maxPriorityFeePerGas: populatedTransaction.maxPriorityFeePerGas,
      };
      await TransactionDB.set(sentTransaction);
      await MineTransactionQueue.add({ queueId: sentTransaction.queueId });
      await enqueueTransactionWebhook(sentTransaction);

      reply.status(StatusCodes.OK).send({
        result: {
          transactionHash,
        },
      });
    },
  });
}

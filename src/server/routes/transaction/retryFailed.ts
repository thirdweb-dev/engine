import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import assert from "node:assert";
import { eth_getTransactionReceipt, getRpcClient } from "thirdweb";
import { getUserOpReceiptRaw } from "thirdweb/dist/types/wallets/smart/lib/bundler";
import { TransactionDB } from "../../../db/transactions/db";
import { getChain } from "../../../utils/chain";
import { thirdwebClient } from "../../../utils/sdk";
import type { ErroredTransaction } from "../../../utils/transaction/types";
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

      const isMined = transaction.isUserOp
        ? await isUserOpMined(transaction)
        : await isTransactionMined(transaction);
      if (isMined) {
        throw createCustomError(
          "Cannot retry a transaction that is already mined.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_CANNOT_BE_RETRIED",
        );
      }

      const sendJob = await SendTransactionQueue.q.getJob(
        SendTransactionQueue.jobId({
          queueId: transaction.queueId,
          resendCount: 0,
        }),
      );
      if (sendJob) {
        await sendJob.remove();
      }

      const mineJob = await MineTransactionQueue.q.getJob(
        MineTransactionQueue.jobId({
          queueId: transaction.queueId,
        }),
      );
      if (mineJob) {
        await mineJob.remove();
      }

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

async function isTransactionMined(transaction: ErroredTransaction) {
  assert(!transaction.isUserOp);

  if (!("sentTransactionHashes" in transaction)) {
    return false;
  }

  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: await getChain(transaction.chainId),
  });
  const promises = transaction.sentTransactionHashes.map((hash) =>
    eth_getTransactionReceipt(rpcRequest, { hash }),
  );
  const results = await Promise.allSettled(promises);

  // If any eth_getTransactionReceipt call succeeded, a valid transaction receipt was found.
  for (const result of results) {
    if (result.status === "fulfilled" && !!result.value.blockNumber) {
      return true;
    }
  }

  return false;
}

async function isUserOpMined(transaction: ErroredTransaction) {
  assert(transaction.isUserOp);

  if (!("userOpHash" in transaction)) {
    return false;
  }

  const userOpReceiptRaw = await getUserOpReceiptRaw({
    client: thirdwebClient,
    chain: await getChain(transaction.chainId),
    userOpHash: transaction.userOpHash,
  });
  return !!userOpReceiptRaw;
}

import { randomUUID } from "crypto";
import { TransactionDB } from "../../db/transactions/db";
import { createCustomError } from "../../server/middleware/error";
import { SendTransactionQueue } from "../../worker/queues/sendTransactionQueue";
import { getChecksumAddress } from "../primitiveTypes";
import { recordMetrics } from "../prometheus";
import { reportUsage } from "../usage";
import { doSimulateTransaction } from "./simulateQueuedTransaction";
import { InsertedTransaction, QueuedTransaction } from "./types";

interface InsertTransactionData {
  insertedTransaction: InsertedTransaction;
  idempotencyKey?: string;
  shouldSimulate?: boolean;
}

/**
 * Enqueue a transaction to be submitted onchain.
 *
 * @param args
 * @returns queueId
 */
export const insertTransaction = async (
  args: InsertTransactionData,
): Promise<string> => {
  const { insertedTransaction, idempotencyKey, shouldSimulate = false } = args;

  // The queueId uniquely represents an enqueued transaction.
  // It's also used as the idempotency key (default = no idempotence).
  let queueId: string = randomUUID();
  if (idempotencyKey) {
    queueId = idempotencyKey;
    if (await TransactionDB.exists(queueId)) {
      // No-op. Return the existing queueId.
      return queueId;
    }
  }

  const queuedTransaction: QueuedTransaction = {
    ...insertedTransaction,
    status: "queued",
    queueId,
    queuedAt: new Date(),
    resendCount: 0,

    from: getChecksumAddress(insertedTransaction.from),
    to: getChecksumAddress(insertedTransaction.to),
    signerAddress: getChecksumAddress(insertedTransaction.signerAddress),
    accountAddress: getChecksumAddress(insertedTransaction.accountAddress),
    target: getChecksumAddress(insertedTransaction.target),
    sender: getChecksumAddress(insertedTransaction.sender),
    value: insertedTransaction.value ?? 0n,
  };

  // Simulate the transaction.
  if (shouldSimulate) {
    const error = await doSimulateTransaction(queuedTransaction);
    if (error) {
      throw createCustomError(
        `Simulation failed: ${error.replace(/[\r\n]+/g, " --- ")}`,
        400,
        "BAD_REQUEST",
      );
    }
  }

  await TransactionDB.set(queuedTransaction);
  await SendTransactionQueue.add({
    queueId: queuedTransaction.queueId,
    resendCount: 0,
  });
  reportUsage([{ action: "queue_tx", input: queuedTransaction }]);

  recordMetrics({
    event: "transaction_queued",
    params: {
      chainId: insertedTransaction.chainId,
      extension: insertedTransaction.extension ?? "none",
    },
  });

  return queueId;
};

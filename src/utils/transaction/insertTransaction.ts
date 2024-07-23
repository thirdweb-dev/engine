import { randomUUID } from "crypto";
import { TransactionDB } from "../../db/transactions/db";
import { createCustomError } from "../../server/middleware/error";
import { SendTransactionQueue } from "../../worker/queues/sendTransactionQueue";
import { reportUsage } from "../usage";
import { simulateQueuedTransaction } from "./simulateQueuedTransaction";
import { InsertedTransaction, QueuedTransaction } from "./types";

interface InsertTransactionData {
  insertedTransaction: InsertedTransaction;
  idempotencyKey?: string;
  shouldSimulate?: boolean;
}

export const insertTransaction = async (
  args: InsertTransactionData,
): Promise<string> => {
  const { insertedTransaction, idempotencyKey, shouldSimulate = false } = args;
  const { value, extension } = insertedTransaction;

  // The queueId is the idempotency key. Default to a random UUID (no idempotency).
  const queueId = idempotencyKey ?? randomUUID();
  if (await TransactionDB.exists(queueId)) {
    // No-op. Return the existing queueId.
    return queueId;
  }

  const queuedTransaction: QueuedTransaction = {
    ...insertedTransaction,
    status: "queued",
    queueId,
    queuedAt: new Date(),
    value: value ?? 0n,
    retryCount: 0,
  };

  // Simulate the transaction.
  if (shouldSimulate) {
    const error = await simulateQueuedTransaction(queuedTransaction);
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
    retryCount: 0,
  });

  reportUsage([{ action: "queue_tx", input: queuedTransaction }]);
  return queueId;
};

import { randomUUID } from "crypto";
import { TransactionDB } from "../../db/transactions/db";
import { createCustomError } from "../../server/middleware/error";
import { enqueuePrepareTransaction } from "../../worker/queues/prepareTransactionQueue";
import { getAccount } from "../account";
import { reportUsage } from "../usage";
import { simulateQueuedTransaction } from "./simulateTransaction";
import { InsertedTransaction, QueuedTransaction } from "./types";

interface InsertTransactionData {
  insertedTransaction: InsertedTransaction;
  idempotencyKey?: string;
  shouldSimulate?: boolean;
}

export const insertTransaction = async (
  args: InsertTransactionData,
): Promise<QueuedTransaction> => {
  const { insertedTransaction, idempotencyKey, shouldSimulate = false } = args;
  const { chainId, from, data, value } = insertedTransaction;

  const account = await getAccount({ chainId, from });
  if (!account) {
    throw new Error(`No backend wallet found: ${from}`);
  }

  const queueId = randomUUID();
  const queuedTransaction: QueuedTransaction = {
    ...insertedTransaction,
    status: "queued",
    queueId: queueId,
    idempotencyKey: idempotencyKey ?? queueId,
    queuedAt: new Date(),
    value: value ?? 0n,
  };

  // Simulate the transaction.
  if (shouldSimulate) {
    const error = await simulateQueuedTransaction(queuedTransaction);
    if (error) {
      throw createCustomError(
        `Simulation failed: ${error}`,
        400,
        "BAD_REQUEST",
      );
    }
  }

  // @TODO handle idempotency

  // Insert to DB.
  await TransactionDB.set(queuedTransaction);
  // Enqueue the QueuedTransaction.
  await enqueuePrepareTransaction({ queuedTransaction });

  reportUsage([{ action: "queue_tx", input: queuedTransaction }]);
  return queuedTransaction;
};

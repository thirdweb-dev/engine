import { randomUUID } from "crypto";
import { estimateGasCost, prepareTransaction } from "thirdweb";
import { getWalletBalance } from "thirdweb/wallets";
import { TransactionDB } from "../../db/transactions/db";
import { createCustomError } from "../../server/middleware/error";
import { SendTransactionQueue } from "../../worker/queues/sendTransactionQueue";
import { getChain } from "../chain";
import { thirdwebClient } from "../sdk";
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
  if (extension === "withdraw") {
    queuedTransaction.value = await getWithdrawValue(queuedTransaction);
  }

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

// This logic is more accurate in the worker, but withdraws are generally not used programmatically during high volume.
const getWithdrawValue = async (
  queuedTransaction: QueuedTransaction,
): Promise<bigint> => {
  const { chainId, from } = queuedTransaction;

  const chain = await getChain(chainId);

  // Get wallet balance.
  const { value: balanceWei } = await getWalletBalance({
    address: from,
    client: thirdwebClient,
    chain,
  });

  // Estimate gas for a transfer.
  const transaction = prepareTransaction({
    chain,
    client: thirdwebClient,
    value: 1n, // dummy value
    to: from, // dummy value
  });
  const { wei: transferCostWei } = await estimateGasCost({ transaction });

  // Add a +50% buffer for gas variance.
  const buffer = transferCostWei / 2n;

  return balanceWei - transferCostWei - buffer;
};

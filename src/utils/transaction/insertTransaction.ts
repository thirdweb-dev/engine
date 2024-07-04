import { randomUUID } from "crypto";
import {
  Address,
  defineChain,
  estimateGasCost,
  prepareTransaction,
} from "thirdweb";
import { getWalletBalance } from "thirdweb/wallets";
import { TransactionDB } from "../../db/transactions/db";
import { createCustomError } from "../../server/middleware/error";
import { enqueueSendTransaction } from "../../worker/queues/sendTransactionQueue";
import { getAccount } from "../account";
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
  const { chainId, from, to, value, extension } = insertedTransaction;

  const account = await getAccount({ chainId, from });
  if (!account) {
    throw new Error(`No backend wallet found: ${from}`);
  }

  // The queueId is the idempotency key. Default to a random UUID (no idempotency).
  const queueId = idempotencyKey ?? randomUUID();
  if (await TransactionDB.exists(queueId)) {
    // No-op. Return the existing queueId.
    return queueId;
  }

  const queuedTransaction: QueuedTransaction = {
    ...insertedTransaction,
    from: from.toLowerCase() as Address,
    to: to?.toLowerCase() as Address,

    status: "queued",
    queueId,
    queuedAt: new Date(),
    value: value ?? 0n,
  };
  if (extension === "withdraw") {
    queuedTransaction.value = await getWithdrawValue(queuedTransaction);
  }

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

  await TransactionDB.set(queuedTransaction);
  await enqueueSendTransaction({
    queueId: queuedTransaction.queueId,
    retryCount: 0,
  });

  reportUsage([{ action: "queue_tx", input: queuedTransaction }]);
  return queueId;
};

const getWithdrawValue = async (
  queuedTransaction: QueuedTransaction,
): Promise<bigint> => {
  const { chainId, from, to } = queuedTransaction;
  if (!to) {
    throw new Error('Missing "to".');
  }

  const chain = defineChain(chainId);

  // Get wallet balance.
  const { value: balanceWei } = await getWalletBalance({
    address: from,
    client: thirdwebClient,
    chain,
  });

  // Estimate gas for a transfer.
  const transaction = prepareTransaction({
    value: BigInt(1),
    to,
    chain,
    client: thirdwebClient,
  });
  const { wei: transferCostWei } = await estimateGasCost({ transaction });

  // Add a 20% buffer for gas variance.
  const buffer = BigInt(Math.round(Number(transferCostWei) * 0.2));

  return balanceWei - transferCostWei - buffer;
};

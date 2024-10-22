import { randomUUID } from "node:crypto";
import { TransactionDB } from "../../db/transactions/db";
import {
  getWalletDetails,
  isSmartBackendWallet,
  type ParsedWalletDetails,
} from "../../db/wallets/getWalletDetails";
import { createCustomError } from "../../server/middleware/error";
import { SendTransactionQueue } from "../../worker/queues/sendTransactionQueue";
import { getChecksumAddress } from "../primitiveTypes";
import { recordMetrics } from "../prometheus";
import { reportUsage } from "../usage";
import { doSimulateTransaction } from "./simulateQueuedTransaction";
import type { InsertedTransaction, QueuedTransaction } from "./types";

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

  let queuedTransaction: QueuedTransaction = {
    ...insertedTransaction,
    status: "queued",
    queueId,
    queuedAt: new Date(),
    resendCount: 0,

    from: getChecksumAddress(insertedTransaction.from),
    to: getChecksumAddress(insertedTransaction.to),
    signerAddress: getChecksumAddress(insertedTransaction.signerAddress),
    accountAddress: getChecksumAddress(insertedTransaction.accountAddress),
    accountSalt: insertedTransaction.accountSalt,
    target: getChecksumAddress(insertedTransaction.target),
    sender: getChecksumAddress(insertedTransaction.sender),
    value: insertedTransaction.value ?? 0n,
  };

  let walletDetails: ParsedWalletDetails | undefined;

  try {
    walletDetails = await getWalletDetails({
      address: queuedTransaction.from,
    });
  } catch {
    // if wallet details are not found, this is a smart backend wallet using a v4 endpoint
  }

  // v5 SDK using smart backend wallet sets isUserOp false, accountAddress is undefined, and from is account address
  // worker needs values to be corrected: isUserOp true, accountAddress is accountAddress, and from is signerAddress
  if (walletDetails && isSmartBackendWallet(walletDetails)) {
    queuedTransaction = {
      ...queuedTransaction,
      isUserOp: true,
      accountAddress: queuedTransaction.from,
      signerAddress: getChecksumAddress(walletDetails.accountSignerAddress),
      from: getChecksumAddress(walletDetails.accountSignerAddress),
      target: queuedTransaction.to,
      accountFactoryAddress: walletDetails.accountFactoryAddress ?? undefined,
      entrypointAddress: walletDetails.entrypointAddress ?? undefined,
    };
  }

  try {
    if (queuedTransaction.accountAddress) {
      walletDetails = await getWalletDetails({
        address: queuedTransaction.accountAddress,
      });
    }
  } catch {
    // if wallet details are not found, this backend wallet does not exist at all
  }

  if (walletDetails && isSmartBackendWallet(walletDetails)) {
    queuedTransaction.entrypointAddress =
      walletDetails.entrypointAddress ?? undefined;
  }

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
      chainId: queuedTransaction.chainId.toString(),
      walletAddress: queuedTransaction.from,
    },
  });

  return queueId;
};

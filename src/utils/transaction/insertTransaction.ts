import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";
import { TransactionDB } from "../../db/transactions/db";
import {
  ParsedWalletDetails,
  getWalletDetails,
  isSmartBackendWallet,
} from "../../db/wallets/getWalletDetails";
import { doesChainSupportService } from "../../lib/chain/chain-capabilities";
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

  // Get wallet details. For EOA and SBW (v5 endpoints), `from` should return a valid backend wallet.
  // For SBW (v4 endpoints), `accountAddress` should return a valid backend wallet.
  // Else the provided details are incorrect (user error).
  let walletDetails: ParsedWalletDetails | undefined;
  let isSmartBackendWalletV4 = false;
  try {
    walletDetails = await getWalletDetails({
      walletAddress: insertedTransaction.from,
    });
  } catch {}
  if (!walletDetails && insertedTransaction.accountAddress) {
    try {
      walletDetails = await getWalletDetails({
        walletAddress: insertedTransaction.accountAddress,
      });
      isSmartBackendWalletV4 = true;
    } catch {}
  }
  if (!walletDetails) {
    throw createCustomError(
      "Account not found",
      StatusCodes.BAD_REQUEST,
      "ACCOUNT_NOT_FOUND",
    );
  }

  let queuedTransaction: QueuedTransaction = {
    ...insertedTransaction,
    status: "queued",
    queueId,
    queuedAt: new Date(),
    resendCount: 0,

    walletType: walletDetails.type,
    from: getChecksumAddress(insertedTransaction.from),
    to: getChecksumAddress(insertedTransaction.to),
    signerAddress: getChecksumAddress(insertedTransaction.signerAddress),
    accountAddress: getChecksumAddress(insertedTransaction.accountAddress),
    accountSalt: insertedTransaction.accountSalt,
    target: getChecksumAddress(insertedTransaction.target),
    sender: getChecksumAddress(insertedTransaction.sender),
    value: insertedTransaction.value ?? 0n,
  };

  // Handle smart backend wallets details.
  if (isSmartBackendWallet(walletDetails)) {
    if (
      !(await doesChainSupportService(
        queuedTransaction.chainId,
        "account-abstraction",
      ))
    ) {
      throw createCustomError(
        `Smart backend wallets do not support chain ${queuedTransaction.chainId}.`,
        StatusCodes.BAD_REQUEST,
        "INVALID_SMART_BACKEND_WALLET_TRANSACTION",
      );
    }

    queuedTransaction = {
      ...queuedTransaction,
      accountFactoryAddress: walletDetails.accountFactoryAddress ?? undefined,
      entrypointAddress: walletDetails.entrypointAddress ?? undefined,
    };

    if (!isSmartBackendWalletV4) {
      if (queuedTransaction.accountAddress) {
        // Disallow smart backend wallets from sending userOps.
        throw createCustomError(
          "Smart backend wallets do not support sending transactions with other smart accounts",
          StatusCodes.BAD_REQUEST,
          "INVALID_SMART_BACKEND_WALLET_TRANSACTION",
        );
      }

      queuedTransaction = {
        ...queuedTransaction,
        isUserOp: true,
        signerAddress: walletDetails.accountSignerAddress,
        from: walletDetails.accountSignerAddress,
        accountAddress: queuedTransaction.from,
        target: queuedTransaction.to,
      };
    }
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

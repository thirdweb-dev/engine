import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";
import { TransactionDB } from "../../db/transactions/db.js";
import {
  getWalletDetails,
  isSmartBackendWallet,
  WalletDetailsError,
  type ParsedWalletDetails,
} from "../../db/wallets/get-wallet-details.js";
import { createCustomError } from "../../../server/middleware/error.js";
import { SendTransactionQueue } from "../../../worker/queues/send-transaction-queue.js";
import { getChecksumAddress } from "../primitive-types.js";
import { recordMetrics } from "../prometheus.js";
import { reportUsage } from "../usage.js";
import { doSimulateTransaction } from "./simulate-queued-transaction.js";
import type { InsertedTransaction, QueuedTransaction } from "./types.js";

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

    // when using the v5 SDK with smart backend wallets, the following values are not set correctly:
    // isUserOp is set to false
    // account address is blank or the user provided value (this should be the SBW account address)
    // from is set to the SBW account address (this should be the SBW signer address)
    // these values need to be corrected so the worker can process the transaction
    if (isSmartBackendWallet(walletDetails)) {
      if (queuedTransaction.accountAddress) {
        throw createCustomError(
          "Smart backend wallets do not support interacting with other smart accounts",
          StatusCodes.BAD_REQUEST,
          "INVALID_SMART_BACKEND_WALLET_INTERACTION",
        );
      }

      queuedTransaction = {
        ...queuedTransaction,
        isUserOp: true,
        signerAddress: walletDetails.accountSignerAddress,
        from: walletDetails.accountSignerAddress,
        accountAddress: queuedTransaction.from,
        target: queuedTransaction.to,
        accountFactoryAddress: walletDetails.accountFactoryAddress ?? undefined,
        entrypointAddress: walletDetails.entrypointAddress ?? undefined,
      };
    }
  } catch (e) {
    if (e instanceof WalletDetailsError) {
      // do nothing. The this is a smart backend wallet using a v4 endpoint
    }
    // if other type of error, rethrow
    throw e;
  }

  if (!walletDetails && queuedTransaction.accountAddress) {
    try {
      walletDetails = await getWalletDetails({
        address: queuedTransaction.accountAddress,
      });

      // when using v4 SDK with smart backend wallets, the following values are not set correctly:
      // entrypointAddress is not set
      // accountFactoryAddress is not set
      if (walletDetails && isSmartBackendWallet(walletDetails)) {
        queuedTransaction = {
          ...queuedTransaction,
          entrypointAddress: walletDetails.entrypointAddress ?? undefined,
          accountFactoryAddress:
            walletDetails.accountFactoryAddress ?? undefined,
        };
      }
    } catch (e: unknown) {
      // if wallet details are not found for this either, this backend wallet does not exist at all
      if (e instanceof WalletDetailsError) {
        throw createCustomError(
          "Account not found",
          StatusCodes.BAD_REQUEST,
          "ACCOUNT_NOT_FOUND",
        );
      }
      throw e;
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

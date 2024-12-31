import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";
import { TransactionDB } from "../../db/transactions/db";
import {
  getWalletDetails,
  isSmartBackendWallet,
  type ParsedWalletDetails,
} from "../../db/wallets/get-wallet-details";
import { doesChainSupportService } from "../../lib/chain/chain-capabilities";
import { createCustomError } from "../../../server/middleware/error";
import { SendTransactionQueue } from "../../../worker/queues/send-transaction-queue";
import { getChecksumAddress } from "../primitive-types";
import { recordMetrics } from "../prometheus";
import { reportUsage } from "../usage";
import { doSimulateTransaction } from "./simulate-queued-transaction";
import type { InsertedTransaction, QueuedTransaction } from "./types";
import type { EnclaveWalletParams } from "../cache/get-enclave-wallet";

interface InsertTransactionData {
  insertedTransaction: InsertedTransaction;
  idempotencyKey?: string;
  shouldSimulate?: boolean;
  enclave?: EnclaveWalletParams;
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
  const {
    insertedTransaction,
    idempotencyKey,
    shouldSimulate = false,
    enclave
  } = args;

  // The queueId uniquely represents an enqueued transaction.
  // It's also used as the idempotency key (default = no idempotence).
  const queueId: string = idempotencyKey ?? randomUUID();
  if (queueId === idempotencyKey) {
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

      if (
        !(await doesChainSupportService(
          queuedTransaction.chainId,
          "account-abstraction",
        ))
      ) {
        throw createCustomError(
          "Chain does not support smart backend wallets",
          StatusCodes.BAD_REQUEST,
          "SBW_CHAIN_NOT_SUPPORTED",
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
  } catch {
    // if wallet details are not found, this is a smart backend wallet using a v4 endpoint
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
        if (
          !(await doesChainSupportService(
            queuedTransaction.chainId,
            "account-abstraction",
          ))
        ) {
          throw createCustomError(
            "Chain does not support smart backend wallets",
            StatusCodes.BAD_REQUEST,
            "SBW_CHAIN_NOT_SUPPORTED",
          );
        }

        queuedTransaction = {
          ...queuedTransaction,
          entrypointAddress: walletDetails.entrypointAddress ?? undefined,
          accountFactoryAddress:
            walletDetails.accountFactoryAddress ?? undefined,
        };
      }
    } catch {
      // if wallet details are not found for this either, this backend wallet does not exist at all
      throw createCustomError(
        "Account not found",
        StatusCodes.BAD_REQUEST,
        "ACCOUNT_NOT_FOUND",
      );
    }
  }

  // Simulate the transaction.
  if (shouldSimulate) {
    const error = await doSimulateTransaction(queuedTransaction, enclave);
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
    enclave,
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

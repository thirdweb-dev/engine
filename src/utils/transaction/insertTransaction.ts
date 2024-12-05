import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";
import { TransactionDB } from "../../db/transactions/db";
import {
  getWalletDetails,
  isSmartBackendWallet,
  type ParsedWalletDetails,
  type SmartBackendWalletDetails,
} from "../../db/wallets/getWalletDetails";
import { doesChainSupportService } from "../../lib/chain/chain-capabilities";
import { createCustomError } from "../../server/middleware/error";
import { SendTransactionQueue } from "../../worker/queues/sendTransactionQueue";
import { getChecksumAddress } from "../primitiveTypes";
import { recordMetrics } from "../prometheus";
import { reportUsage } from "../usage";
import { doSimulateTransaction } from "./simulateQueuedTransaction";
import type { InsertedTransaction, QueuedTransaction } from "./types";

/**
 * Transaction Processing Cases & SDK Compatibility Layer
 *
 * Transaction Detection Logic:
 * 1. First, try to find wallet by 'from' address:
 *    - If found and is smart backend wallet -> Must be V5 SDK, needs transformation
 *    - If found and is regular wallet -> Could be V4 or V5, no transformation needed
 *    - If not found -> Check for V4 smart backend wallet case
 * 2. If 'from' not found and has accountAddress:
 *    - If found and is smart backend wallet -> V4 SDK case
 *    - Otherwise -> Server Error (invalid wallet configuration)
 * 3. If 'from' not found and no accountAddress -> Error
 *
 * Cases by Detection Path:
 *
 * Found by 'from' address, is Smart Backend Wallet:
 * Case 1: V5 Smart Backend Wallet
 * - 'from' is smart backend wallet address
 * - accountAddress must NOT be set
 * - Needs transformation:
 *   * from -> becomes signer address (from wallet.accountSignerAddress)
 *   * original from -> becomes account address
 *   * to -> becomes target
 *   * set isUserOp true
 *   * add wallet specific addresses (entrypoint, factory)
 *
 * Found by 'from' address, is Regular Wallet:
 * Case 2: Regular Wallet (V4 or V5)
 * - 'from' exists as regular wallet
 * - may optionally have accountAddress for AA
 * - No transformation needed, just add wallet type
 *
 * Found by accountAddress after 'from' not found:
 * Case 3: V4 Smart Backend Wallet
 * - 'from' not found in DB
 * - accountAddress must exist as smart backend wallet
 * - Needs transformation:
 *   * add wallet specific addresses (entrypoint, factory)
 *
 * Critical Requirements:
 * 1. Smart backend wallets must be validated for chain support
 * 2. V5 smart backend wallets must not have accountAddress set
 * 3. Every transaction needs a wallet type
 * 4. Addresses must be normalized to checksum format
 * 5. Properties like accountSignerAddress, accountFactoryAddress, and entrypoint
 *    are only available on SmartBackendWalletDetails type
 * 6. Only smart backend wallets can be found via accountAddress lookup when 'from'
 *    is not found - finding anything else indicates invalid wallet configuration
 */

interface InsertTransactionData {
  insertedTransaction: InsertedTransaction;
  idempotencyKey?: string;
  shouldSimulate?: boolean;
}

const validateSmartBackendWalletChainSupport = async (chainId: number) => {
  if (!(await doesChainSupportService(chainId, "account-abstraction"))) {
    throw createCustomError(
      "Chain does not support smart backend wallets",
      StatusCodes.BAD_REQUEST,
      "SBW_CHAIN_NOT_SUPPORTED",
    );
  }
};

const transformV5SmartBackendWallet = async (
  transaction: QueuedTransaction,
  walletDetails: SmartBackendWalletDetails,
): Promise<QueuedTransaction> => {
  await validateSmartBackendWalletChainSupport(transaction.chainId);

  if (transaction.accountAddress) {
    throw createCustomError(
      "Smart backend wallets do not support interacting with other smart accounts",
      StatusCodes.BAD_REQUEST,
      "INVALID_SMART_BACKEND_WALLET_INTERACTION",
    );
  }

  return {
    ...transaction,
    isUserOp: true,
    signerAddress: walletDetails.accountSignerAddress,
    from: walletDetails.accountSignerAddress,
    accountAddress: transaction.from,
    target: transaction.to,
    accountFactoryAddress: walletDetails.accountFactoryAddress ?? undefined,
    entrypointAddress: walletDetails.entrypointAddress ?? undefined,
    walletType: walletDetails.type,
  };
};

const transformV4SmartBackendWallet = async (
  transaction: QueuedTransaction,
  walletDetails: SmartBackendWalletDetails,
): Promise<QueuedTransaction> => {
  await validateSmartBackendWalletChainSupport(transaction.chainId);

  return {
    ...transaction,
    entrypointAddress: walletDetails.entrypointAddress ?? undefined,
    accountFactoryAddress: walletDetails.accountFactoryAddress ?? undefined,
    walletType: walletDetails.type,
  };
};

/**
 * Enqueue a transaction to be submitted onchain.
 */
export const insertTransaction = async (
  args: InsertTransactionData,
): Promise<string> => {
  const { insertedTransaction, idempotencyKey, shouldSimulate = false } = args;

  // Handle idempotency
  const queueId: string = idempotencyKey ?? randomUUID();
  if (idempotencyKey && (await TransactionDB.exists(queueId))) {
    return queueId;
  }

  // Normalize addresses
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
    walletType: "local", // we override this later
  };

  // First attempt: try to find wallet by 'from' address
  let walletDetails: ParsedWalletDetails | undefined;
  let walletFoundByFrom = false;

  try {
    walletDetails = await getWalletDetails({
      walletAddress: queuedTransaction.from,
    });
    walletFoundByFrom = true;
  } catch {}

  // Case 1 & 2: Wallet found by 'from'
  if (walletFoundByFrom && walletDetails) {
    if (isSmartBackendWallet(walletDetails)) {
      // Case 1: V5 Smart Backend Wallet
      queuedTransaction = await transformV5SmartBackendWallet(
        queuedTransaction,
        walletDetails,
      );
    } else {
      // Case 2: Regular wallet (V4 or V5) - just add wallet type
      queuedTransaction.walletType = walletDetails.type;
    }
  } else {
    // From this point on, we're in Case 3 territory - check for V4 smart backend wallet
    if (!queuedTransaction.accountAddress) {
      throw createCustomError(
        "Account not found",
        StatusCodes.BAD_REQUEST,
        "ACCOUNT_NOT_FOUND",
      );
    }

    try {
      walletDetails = await getWalletDetails({
        walletAddress: queuedTransaction.accountAddress,
      });
    } catch {
      throw createCustomError(
        "Account not found",
        StatusCodes.BAD_REQUEST,
        "ACCOUNT_NOT_FOUND",
      );
    }

    // Case 3: Must be a V4 smart backend wallet
    if (!isSmartBackendWallet(walletDetails)) {
      throw createCustomError(
        "Invalid wallet configuration in database - non-smart-backend wallet found via accountAddress",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "INVALID_WALLET_CONFIGURATION",
      );
    }

    queuedTransaction = await transformV4SmartBackendWallet(
      queuedTransaction,
      walletDetails,
    );
  }

  // Simulate if requested
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

  // Queue transaction
  await TransactionDB.set(queuedTransaction);
  await SendTransactionQueue.add({
    queueId: queuedTransaction.queueId,
    resendCount: 0,
  });

  // Report metrics
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

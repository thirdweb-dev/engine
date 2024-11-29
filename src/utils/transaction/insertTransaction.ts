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
 * This code handles transaction processing across two SDK versions (v4 and v5) and two wallet types
 * (smart backend wallets and regular wallets). Each case needs different handling:
 *
 * Case 1: V5 SDK with Smart Backend Wallet
 * - 'from' address is the smart backend wallet address
 * - accountAddress must NOT be set (SDK shouldn't allow interacting with other accounts)
 * - Requires transformation:
 *   * from -> becomes signer address (from wallet.accountSignerAddress)
 *   * original from -> becomes account address
 *   * to -> becomes target
 *   * set isUserOp true
 *   * add accountFactoryAddress and entrypoint from wallet details
 *
 * Case 2: V4 SDK with Smart Backend Wallet
 * - accountAddress is set to the smart backend wallet address
 * - 'from' address not in wallet DB
 * - Requires transformation:
 *   * add entrypoint and accountFactory addresses from wallet details
 *
 * Case 3: V5 SDK with Regular Wallet
 * - 'from' address is a regular wallet
 * - No transformation needed, just add wallet type
 * - May optionally have accountAddress for sending via a smart account
 *
 * Case 4: V4 SDK with Regular Wallet
 * - Similar to Case 3
 * - Only difference is how we detect wallet (via accountAddress)
 */

interface InsertTransactionData {
  insertedTransaction: InsertedTransaction;
  idempotencyKey?: string;
  shouldSimulate?: boolean;
}

interface TransactionContext {
  processedTransaction: QueuedTransaction;
}

type SdkVersion = "v4" | "v5";

interface ResolvedWalletDetails {
  sdkVersion: SdkVersion;
  walletDetails: ParsedWalletDetails;
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

/**
 * Transform transaction for Case 1 (V5 Smart Backend Wallet)
 * Type guard ensures walletDetails has required smart wallet properties
 */
const transformV5SmartBackendWallet = async (
  transaction: QueuedTransaction,
  walletDetails: SmartBackendWalletDetails, // Note: narrowed type
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
    accountAddress: transaction.from, // Original 'from' becomes the account
    target: transaction.to,
    accountFactoryAddress: walletDetails.accountFactoryAddress ?? undefined,
    entrypointAddress: walletDetails.entrypointAddress ?? undefined,
    walletType: walletDetails.type,
  };
};

/**
 * Transform transaction for Case 2 (V4 Smart Backend Wallet)
 * Type guard ensures walletDetails has required smart wallet properties
 */
const transformV4SmartBackendWallet = async (
  transaction: QueuedTransaction,
  walletDetails: SmartBackendWalletDetails, // Note: narrowed type
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
 * Try to resolve wallet details, determining if we're in V4 or V5 case
 * For V5: wallet details should be found from 'from' address (Cases 1 & 3)
 * For V4: wallet details are found from accountAddress (Cases 2 & 4)
 */
const resolveWalletDetails = async (
  transaction: QueuedTransaction,
): Promise<ResolvedWalletDetails> => {
  // Try V5 path first (Cases 1 & 3)
  try {
    const walletDetails = await getWalletDetails({
      walletAddress: transaction.from,
    });
    return { sdkVersion: "v5", walletDetails };
  } catch {} // Silently handle V5 failure

  // If primary address fails and no accountAddress, we can't proceed
  if (!transaction.accountAddress) {
    throw createCustomError(
      "Account not found",
      StatusCodes.BAD_REQUEST,
      "ACCOUNT_NOT_FOUND",
    );
  }

  // Try V4 path (Cases 2 & 4)
  try {
    const walletDetails = await getWalletDetails({
      walletAddress: transaction.accountAddress,
    });
    return { sdkVersion: "v4", walletDetails };
  } catch {
    throw createCustomError(
      "Account not found",
      StatusCodes.BAD_REQUEST,
      "ACCOUNT_NOT_FOUND",
    );
  }
};

/**
 * Handle both transformation cases and add wallet type for non-transformed cases
 * Uses type guard to ensure smart wallet properties are available when needed
 */
const detectAndTransformTransaction = async (
  transaction: QueuedTransaction,
): Promise<TransactionContext> => {
  const { sdkVersion, walletDetails } = await resolveWalletDetails(transaction);

  // isSmartBackendWallet is a type guard that narrows walletDetails
  if (!isSmartBackendWallet(walletDetails)) {
    // Cases 3 & 4: Regular wallet cases just need wallet type
    return {
      processedTransaction: {
        ...transaction,
        walletType: walletDetails.type,
      },
    };
  }

  // walletDetails is now narrowed to SmartBackendWalletDetails
  const processedTransaction = await (sdkVersion === "v5"
    ? transformV5SmartBackendWallet(transaction, walletDetails)
    : transformV4SmartBackendWallet(transaction, walletDetails));

  return { processedTransaction };
};

const normalizeAddresses = (
  transaction: InsertedTransaction,
): QueuedTransaction => ({
  ...transaction,
  status: "queued",
  queueId: "", // Will be set later
  queuedAt: new Date(),
  resendCount: 0,
  from: getChecksumAddress(transaction.from),
  to: getChecksumAddress(transaction.to),
  signerAddress: getChecksumAddress(transaction.signerAddress),
  accountAddress: getChecksumAddress(transaction.accountAddress),
  accountSalt: transaction.accountSalt,
  target: getChecksumAddress(transaction.target),
  sender: getChecksumAddress(transaction.sender),
  value: transaction.value ?? 0n,
  walletType: "local", // Will be set later
});

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

  // Normalize addresses and create initial transaction
  let queuedTransaction = normalizeAddresses(insertedTransaction);
  queuedTransaction.queueId = queueId;

  // Detect case and transform transaction accordingly
  const { processedTransaction } =
    await detectAndTransformTransaction(queuedTransaction);
  queuedTransaction = processedTransaction;

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

import type { Address, Hex, toSerializableTransaction } from "thirdweb";
import type { TransactionType } from "viem";

// TODO: Replace with thirdweb SDK exported type when available.
export type PopulatedTransaction = Awaited<
  ReturnType<typeof toSerializableTransaction>
>;

export type AnyTransaction =
  | QueuedTransaction
  | SentTransaction
  | MinedTransaction
  | CancelledTransaction
  | ErroredTransaction;

// InsertedTransaction is the raw input from the caller.
export type InsertedTransaction = {
  isUserOp: boolean;
  chainId: number;
  from: Address;
  to?: Address;
  value?: bigint;

  data?: Hex;
  functionName?: string;
  functionArgs?: any[];

  // User-provided overrides.
  overrides?: {
    gas?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  };
  timeoutSeconds?: number;

  // Offchain metadata
  deployedContractAddress?: Address;
  deployedContractType?: string;
  extension?: string;

  // User Operation
  signerAddress?: Address;
  accountAddress?: Address;
  accountSalt?: string;
  accountFactoryAddress?: Address;
  entrypointAddress?: Address;
  target?: Address;
  sender?: Address;
};

// QueuedTransaction is a transaction added to the queue. No preparation has been done yet.
export type QueuedTransaction = InsertedTransaction & {
  status: "queued";

  resendCount: number;
  queueId: string;
  queuedAt: Date;
  value: bigint;
  data?: Hex;

  manuallyResentAt?: Date;
};

// SentTransaction has been submitted to RPC successfully.
export type SentTransaction = (Omit<QueuedTransaction, "status"> & {
  status: "sent";

  sentAt: Date;
  sentAtBlock: bigint;

  // Gas settings are estimated if not provided in `overrides`.
  // For a MinedTransaction, these are replaced by onchain values from the receipt.
  gas: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}) &
  (
    | { isUserOp: false; nonce: number; sentTransactionHashes: Hex[] }
    | { isUserOp: true; nonce: string; userOpHash: Hex }
  );

// This type allows extending SentTransaction to support the ORed fields.
type _SentTransactionEOA = SentTransaction & { isUserOp: false };
type _SentTransactionUserOp = SentTransaction & { isUserOp: true };

export type MinedTransaction = (
  | Omit<_SentTransactionEOA, "status">
  | Omit<_SentTransactionUserOp, "status">
) & {
  status: "mined";

  transactionHash: Hex;
  minedAt: Date;
  minedAtBlock: bigint;
  transactionType: TransactionType;
  onchainStatus: "success" | "reverted";
  gasUsed: bigint;
  effectiveGasPrice?: bigint;
  cumulativeGasUsed?: bigint;

  // mined transactions can have an error message if they revert
  errorMessage?: string;
};

// ErroredTransaction received an error before or while sending to RPC.
// A transaction that reverted onchain is not considered "errored".
export type ErroredTransaction = (
  | Omit<QueuedTransaction, "status">
  | Omit<_SentTransactionEOA, "status">
  | Omit<_SentTransactionUserOp, "status">
) & {
  status: "errored";

  errorMessage: string;
};

// CancelledTransaction has been cancelled either via API or after some deadline.
export type CancelledTransaction = (
  | Omit<_SentTransactionEOA, "status">
  | Omit<_SentTransactionUserOp, "status">
) & {
  status: "cancelled";

  cancelledAt: Date;
};

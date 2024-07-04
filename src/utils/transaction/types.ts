import { Address, Hex } from "thirdweb";
import { TransactionType } from "viem";

export type AnyTransaction =
  | QueuedTransaction
  | SentTransaction
  | MinedTransaction
  | CancelledTransaction
  | ErroredTransaction;

// InsertedTransaction is the raw input from the caller.
export type InsertedTransaction = {
  chainId: number;
  from: Address;
  to?: Address;
  value?: bigint;

  data?: Hex;
  functionName?: string;
  functionArgs?: any[];

  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;

  // Offchain metadata
  deployedContractAddress?: string;
  deployedContractType?: string;
  extension?: string;
};

// QueuedTransaction is a transaction added to the queue. No preparation has been done yet.
export type QueuedTransaction = InsertedTransaction & {
  status: "queued";

  queueId: string;
  queuedAt: Date;
  value: bigint;
  data?: Hex;
};

// SentTransaction has been submitted to RPC successfully.
export type SentTransaction = Omit<QueuedTransaction, "status"> & {
  status: "sent";

  retryCount: number;
  nonce: number;
  sentAt: Date;
  sentAtBlock: bigint;
  sentTransactionHashes: Hex[];
};

export type MinedTransaction = Omit<SentTransaction, "status"> & {
  status: "mined";

  transactionHash: Hex;
  minedAt: Date;
  minedAtBlock: bigint;
  transactionType: TransactionType;
  onchainStatus: "success" | "reverted";
  gasUsed: bigint;
  effectiveGasPrice: bigint;
};

// ErroredTransaction received an error before or while sending to RPC.
// A transaction that reverted onchain is not considered "errored".
export type ErroredTransaction = Omit<QueuedTransaction, "status"> & {
  status: "errored";

  errorMessage: string;
};

// CancelledTransaction has been cancelled either via API or after some deadline.
export type CancelledTransaction = Omit<SentTransaction, "status"> & {
  status: "cancelled";

  cancelledAt: Date;
};

import { Hex } from "thirdweb";
import { Address, TransactionType } from "viem";

export type AnyTransaction =
  | QueuedTransaction
  | PreparedTransaction
  | SentTransaction
  | ConfirmedTransaction
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

// QueuedTransaction is a transaction added to the queue.
export type QueuedTransaction = InsertedTransaction & {
  status: "queued";

  queueId: string;
  idempotencyKey: string;
  queuedAt: Date;
  value: bigint;
};

// PreparedTransaction has been simulated with partial onchain details set.
export type PreparedTransaction = Omit<QueuedTransaction, "status"> & {
  status: "prepared";

  data: Hex;
  nonce: number;
  retryCount: number;
};

// SentTransaction has been submitted to RPC successfully.
export type SentTransaction = Omit<PreparedTransaction, "status"> & {
  status: "sent";

  sentAt: Date;
  sentAtBlock: bigint;
  transactionHash: Hex;
};

export type ConfirmedTransaction = Omit<SentTransaction, "status"> & {
  status: "confirmed";

  confirmedAt: Date;
  confirmedAtBlock: bigint;
  type: TransactionType;
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

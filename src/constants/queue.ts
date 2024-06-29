export const TX_QUEUE_PENDING = "tx_pending";
export const TX_QUEUE_PROCESSING = "tx_processing";
export const TX_QUEUE_RETRY = "tx_retry";
export const TX_QUEUE_FAILED = "tx_failed";

export type Transaction = {
  chainId: string;
  data: string;
  value: string | undefined;
  nonce?: number | undefined;
};

export type EOATransaction = Transaction & {
  fromAddress: string;
  toAddress?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
  gasLimit?: string;
  transactionType?: number;
  transactionHash?: string;
  callData?: string;
  callGasLimit?: string;
  verificationGasLimit?: string;
  preVerificationGas?: string;
  functionName: string | undefined;
  functionArgs: string | undefined;
  extension: string | undefined;
};

export type AATransaction = Transaction & {
  signerAddress: string;
  accountAddress: string;
  paymasterAndData?: string;
  userOpHash?: string;
  initCode?: string;
  sender?: string;
  target?: string;
};

export type DeployTransaction = Transaction & {
  fromAddress: string;
  deployedContractAddress?: string;
  deployedContractType?: string;
};

export type TxQueue = {
  id: string;
  txn: Transaction;
  status: TxQueueStatus;
  pendingAt: Date;
  processingAt?: Date;
  retryAt?: Date;
  retryCount?: number;
  retryGasValues?: boolean | null;
  retryMaxPriorityFeePerGas?: string | null;
  retryMaxFeePerGas?: string | null;
  errorMessage?: string | null;
  failedAt?: Date;
  sentAt?: Date;
  sentAtBlockNumber?: number | null;
  minedAt?: Date;
  minedAtBlockNumber?: number | null;
  cancelledAt?: Date;
};

export enum TxQueueStatus {
  // Tx was received and waiting to be processed.
  Pending = "pending",
  Processing = "processing",
  // Tx was submitted to mempool.
  Sent = "sent",
  // Tx was successfully mined onchain. Note: The tx may have "reverted" onchain.
  Mined = "mined",
  Retry = "retry",
  // Tx was cancelled and will not be re-attempted.
  Cancelled = "cancelled",
  // Tx failed before submitting to mempool.
  Errored = "errored",
}

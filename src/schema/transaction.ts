export type InputTransaction = {
  groupId?: string;
  idempotencyKey?: string;

  // Onchain data
  chainId: string;
  fromAddress?: string;
  toAddress?: string;
  data: string;
  value?: string;
  functionName?: string;
  functionArgs?: string;
  extension?: string;

  // User operation
  target?: string;
  signerAddress?: string;
  accountAddress?: string;

  // Contract deployment
  deployedContractAddress?: string;
  deployedContractType?: string;
};

export type QueuedTransaction = InputTransaction & {
  id: string;
  idempotencyKey: string;
  queuedAt: Date;

  // Onchain data
  value: string;

  // User operation
  initCode?: string;
  callData?: string;
  callGasLimit?: string;
  verificationGasLimit?: string;
  preVerificationGas?: string;
  paymasterAndData?: string;
};

export type SentTransaction = QueuedTransaction & {
  sentAt: Date;
  sentAtBlockNumber: number;

  // Prepared onchain data
  gasLimit: string;
  nonce: number;
  gasPrice: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;

  // From RPC response
  transactionType: number;
  transactionHash: string;
  userOpHash?: string;

  // Retry data
  retryCount: number;
  retryGasValues?: boolean;
  retryMaxPriorityFeePerGas?: string;
  retryMaxFeePerGas?: string;
};

export type MinedTransaction = SentTransaction & {
  minedAt: Date;
  blockNumber: number;
  onChainTxStatus: number;
};

export type ErroredTransaction = (QueuedTransaction | SentTransaction) & {
  errorMessage: string;
};

export type CancelledTransaction = (QueuedTransaction | SentTransaction) & {
  cancelledAt: Date;
};

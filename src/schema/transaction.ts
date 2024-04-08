export type InputTransaction = {
  groupId?: string;
  idempotencyKey?: string;

  // Onchain data
  chainId: number;
  fromAddress?: string;
  toAddress?: string;
  data: string;
  value?: bigint;
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
  value: bigint;

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
  sentAtBlock: bigint;
  gas: bigint;
  nonce: number;
  transactionHash: `0x${string}`;
  userOpHash?: `0x${string}`;
} & (
    | {
        gasPrice: bigint;
        maxFeePerGas: undefined;
        maxPriorityFeePerGas: undefined;
      }
    | {
        gasPrice: undefined;
        maxFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
      }
  );

export type MinedTransaction = SentTransaction & {
  minedAt: Date;
  minedAtBlock: bigint;
  onChainTxStatus: "success" | "reverted";
};

export type ErroredTransaction = (QueuedTransaction | SentTransaction) & {
  errorMessage: string;
};

export type CancelledTransaction = (QueuedTransaction | SentTransaction) & {
  cancelledAt: Date;
};

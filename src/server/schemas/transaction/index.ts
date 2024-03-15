import { Type } from "@sinclair/typebox";

export const transactionResponseSchema = Type.Object({
  queueId: Type.Union([
    Type.String({
      description: "An identifier for an enqueued blockchain write call",
    }),
    Type.Null(),
  ]),
  chainId: Type.Union([
    Type.String({
      description: "The chain ID for the transaction",
    }),
    Type.Null(),
  ]),
  fromAddress: Type.Union([
    Type.String({
      description: "The backend wallet submitting the transaction",
    }),
    Type.Null(),
  ]),
  toAddress: Type.Union([
    Type.String({
      description: "The contract address to be called",
    }),
    Type.Null(),
  ]),
  data: Type.Union([
    Type.String({
      description: "Encoded calldata",
    }),
    Type.Null(),
  ]),
  extension: Type.Union([
    Type.String({
      description: "The extension detected by thirdweb",
    }),
    Type.Null(),
  ]),
  value: Type.Union([
    Type.String({
      description: "The amount of native currency to send",
    }),
    Type.Null(),
  ]),
  nonce: Type.Union([
    Type.Number({
      description: "The nonce used by the backend wallet for this transaction",
    }),
    Type.Null(),
  ]),
  gasLimit: Type.Union([
    Type.String({
      description: "The max gas unit limit",
    }),
    Type.Null(),
  ]),
  gasPrice: Type.Union([
    Type.String({
      description: "The gas price used",
    }),
    Type.Null(),
  ]),
  maxFeePerGas: Type.Union([
    Type.String({
      description: "The max fee per gas (EIP-1559)",
    }),
    Type.Null(),
  ]),
  maxPriorityFeePerGas: Type.Union([
    Type.String({
      description: "The max priority fee per gas (EIP-1559)",
    }),
    Type.Null(),
  ]),
  transactionType: Type.Union([
    Type.Number({
      description: "The type of transaction",
    }),
    Type.Null(),
  ]),
  transactionHash: Type.Union([
    Type.String({
      description: "The transaction hash (may not be mined)",
    }),
    Type.Null(),
  ]),
  queuedAt: Type.Union([
    Type.String({
      description: "When the transaction is enqueued",
    }),
    Type.Null(),
  ]),
  processedAt: Type.Union([
    Type.String({
      description: "When the transaction is handled by a worker",
    }),
    Type.Null(),
  ]),
  sentAt: Type.Union([
    Type.String({
      description: "When the transaction is submitted to mempool",
    }),
    Type.Null(),
  ]),
  minedAt: Type.Union([
    Type.String({
      description: "When the transaction is mined onchain",
    }),
    Type.Null(),
  ]),
  cancelledAt: Type.Union([
    Type.String({
      description: "When the transactino is cancelled",
    }),
    Type.Null(),
  ]),
  deployedContractAddress: Type.Union([
    Type.String({
      description: "The address for a deployed contract",
    }),
    Type.Null(),
  ]),
  deployedContractType: Type.Union([
    Type.String({
      description: "The type of a deployed contract",
    }),
    Type.Null(),
  ]),
  errorMessage: Type.Union([
    Type.String({
      description: "The error that occurred",
    }),
    Type.Null(),
  ]),
  sentAtBlockNumber: Type.Union([
    Type.Number({
      description:
        "The block number when the transaction is submitted to mempool",
    }),
    Type.Null(),
  ]),
  blockNumber: Type.Union([
    Type.Number({
      description: "The block number when the transaction is mined",
    }),
    Type.Null(),
  ]),
  status: Type.Union([
    Type.String({
      description: "The transaction status",
      examples: ["processed", "queued", "sent", "errored", "mined"],
    }),
    Type.Null(),
  ]),
  retryCount: Type.Number({
    description: "The number of retry attempts",
  }),
  retryGasValues: Type.Union([
    Type.Boolean({
      description: "Whether to replace gas values on the next retry",
    }),
    Type.Null(),
  ]),
  retryMaxFeePerGas: Type.Union([
    Type.String({
      description: "The max fee per gas to use on retry",
    }),
    Type.Null(),
  ]),
  retryMaxPriorityFeePerGas: Type.Union([
    Type.String({
      description: "The max priority fee per gas to use on retry",
    }),
    Type.Null(),
  ]),
  signerAddress: Type.Union([Type.String(), Type.Null()]),
  accountAddress: Type.Union([Type.String(), Type.Null()]),
  target: Type.Union([Type.String(), Type.Null()]),
  sender: Type.Union([Type.String(), Type.Null()]),
  initCode: Type.Union([Type.String(), Type.Null()]),
  callData: Type.Union([Type.String(), Type.Null()]),
  callGasLimit: Type.Union([Type.String(), Type.Null()]),
  verificationGasLimit: Type.Union([Type.String(), Type.Null()]),
  preVerificationGas: Type.Union([Type.String(), Type.Null()]),
  paymasterAndData: Type.Union([Type.String(), Type.Null()]),
  userOpHash: Type.Union([Type.String(), Type.Null()]),
  functionName: Type.Union([Type.String(), Type.Null()]),
  functionArgs: Type.Union([Type.String(), Type.Null()]),
  onChainTxStatus: Type.Union([Type.Number(), Type.Null()]),
});

export enum TransactionStatus {
  // Tx was received and waiting to be processed.
  Queued = "queued",
  // Tx was submitted to mempool.
  Sent = "sent",
  // Tx (userOp for smart account) was submitted to mempool.
  UserOpSent = "user-op-sent",
  // Tx failed before submitting to mempool.
  Errored = "errored",
  // Tx was successfully mined onchain. Note: The tx may have "reverted" onchain.
  Mined = "mined",
  // Tx was cancelled and will not be re-attempted.
  Cancelled = "cancelled",
}

export interface TransactionSchema {
  identifier?: string;
  walletAddress?: string;
  contractAddress?: string;
  chainId?: string;
  extension?: string;
  rawFunctionName?: string;
  rawFunctionArgs?: string;
  txProcessed?: boolean;
  txSubmitted?: boolean;
  txErrored?: boolean;
  txMined?: boolean;
  encodedInputData?: string;
  txType?: number;
  gasPrice?: string;
  gasLimit?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  txHash?: string;
  status?: string;
  createdTimestamp?: Date;
  txSubmittedTimestamp?: Date;
  txProcessedTimestamp?: Date;
  submittedTxNonce?: number;
  deployedContractAddress?: string;
  contractType?: string;
  txValue?: string;
  errorMessage?: string;
  txMinedTimestamp?: Date;
  blockNumber?: number;
  toAddress?: string;
  txSubmittedAtBlockNumber?: number;
  numberOfRetries?: number;
  overrideGasValuesForTx?: boolean;
  overrideMaxFeePerGas?: string;
  overrideMaxPriorityFeePerGas?: string;
}

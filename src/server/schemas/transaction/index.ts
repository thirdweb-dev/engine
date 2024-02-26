import { Type } from "@sinclair/typebox";

export const transactionResponseSchema = Type.Object({
  queueId: Type.Union([
    Type.String({
      description: "The identifier for a queued transaction",
    }),
    Type.Null(),
  ]),
  chainId: Type.Union([
    Type.String({
      description: "The chain where the transaction was submited",
    }),
    Type.Null(),
  ]),
  fromAddress: Type.Union([
    Type.String({
      description: "The wallet address that submitted the transaction",
    }),
    Type.Null(),
  ]),
  toAddress: Type.Union([
    Type.String({
      description: "The contract address called by transaction",
    }),
    Type.Null(),
  ]),
  data: Type.Union([
    Type.String({
      description: "The encoded data in the transaction",
    }),
    Type.Null(),
  ]),
  extension: Type.Union([
    Type.String({
      description: "The thirdweb extension type",
    }),
    Type.Null(),
  ]),
  value: Type.Union([
    Type.String({
      description: "The amount of native coin sent",
    }),
    Type.Null(),
  ]),
  nonce: Type.Union([
    Type.Number({
      description: "The nonce of the sending wallet",
    }),
    Type.Null(),
  ]),
  gasLimit: Type.Union([
    Type.String({
      description: "The maximum gas units used for the transaction",
    }),
    Type.Null(),
  ]),
  gasPrice: Type.Union([
    Type.String({
      description: "The gas price value used (legacy)",
    }),
    Type.Null(),
  ]),
  maxFeePerGas: Type.Union([
    Type.String({
      description: "The max fee per gas unit used (EIP 1559)",
    }),
    Type.Null(),
  ]),
  maxPriorityFeePerGas: Type.Union([
    Type.String({
      description: "The max priority fee per gas used (EIP 1559)",
    }),
    Type.Null(),
  ]),
  transactionType: Type.Union([
    Type.Number({
      description: "The EVM transaction type",
    }),
    Type.Null(),
  ]),
  transactionHash: Type.Union([
    Type.String({
      description: "The hash where to track onchain status",
    }),
    Type.Null(),
  ]),
  queuedAt: Type.Union([
    Type.String({
      description: "The time when the transaction was enqueued to Engine",
    }),
    Type.Null(),
  ]),
  processedAt: Type.Union([
    Type.String({
      description:
        "The time when Engine processed the transaction from the queue",
    }),
    Type.Null(),
  ]),
  sentAt: Type.Union([
    Type.String({
      description:
        "The time when the transaction is submitted to an RPC provider",
    }),
    Type.Null(),
  ]),
  minedAt: Type.Union([
    Type.String({
      description: "The time when the transaction is mined onchain",
    }),
    Type.Null(),
  ]),
  cancelledAt: Type.Union([
    Type.String({
      description: "The time when a transaction is canceled",
    }),
    Type.Null(),
  ]),
  deployedContractAddress: Type.Union([
    Type.String({
      description: "The contract address for a deployed contract",
    }),
    Type.Null(),
  ]),
  deployedContractType: Type.Union([
    Type.String({
      description: "The type of contract deployed",
    }),
    Type.Null(),
  ]),
  errorMessage: Type.Union([
    Type.String({
      description:
        "The error that occurred while enqueuing, processing, or submitting the transaction",
    }),
    Type.Null(),
  ]),
  sentAtBlockNumber: Type.Union([
    Type.Number({
      description: "The block number when the transaction was submitted",
    }),
    Type.Null(),
  ]),
  blockNumber: Type.Union([
    Type.Number({
      description: "The block number when the transaction was mined onchain",
    }),
    Type.Null(),
  ]),
  status: Type.Union([
    Type.String({
      description: "The current status of the transaction",
      examples: ["processed", "queued", "sent", "errored", "mined"],
    }),
    Type.Null(),
  ]),
  retryCount: Type.Number({
    description: "The number of retry attempts for the transaction",
  }),
  retryGasValues: Type.Union([
    Type.Boolean({
      description:
        "Indicates whether the transaction should use provided gas values for retries",
    }),
    Type.Null(),
  ]),
  retryMaxFeePerGas: Type.Union([
    Type.String({
      description: "The max fee per gas used to use for a retry attempt",
    }),
    Type.Null(),
  ]),
  retryMaxPriorityFeePerGas: Type.Union([
    Type.String({
      description: "The max priority fee per gas to use for a retry attempt",
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

export enum TransactionStatusEnum {
  Processed = "processed",
  Queued = "queued",
  // TODO: Switch to sent
  Submitted = "sent",
  UserOpSent = "user-op-sent",
  Errored = "errored",
  Mined = "mined",
  Cancelled = "cancelled",
  Retried = "retried",
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

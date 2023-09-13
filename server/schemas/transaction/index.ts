import { Type } from "@sinclair/typebox";

export const transactionResponseSchema = Type.Object({
  queueId: Type.Union([
    Type.String({
      description: "Request Identifier",
    }),
    Type.Null(),
  ]),
  chainId: Type.Union([
    Type.Number({
      description: "Chain ID where the transaction was submitted",
    }),
    Type.Null(),
  ]),
  fromAddress: Type.Union([
    Type.String({
      description: "Wallet Address used for the transaction",
    }),
    Type.Null(),
  ]),
  toAddress: Type.Union([
    Type.String({
      description: "Contract Address used for the transaction",
    }),
    Type.Null(),
  ]),
  data: Type.Union([
    Type.String({
      description: "Encoded Input Data",
    }),
    Type.Null(),
  ]),
  extension: Type.Union([
    Type.String({
      description: "ThirdWeb Extension type",
    }),
    Type.Null(),
  ]),
  value: Type.Union([
    Type.String({
      description: "Value for the transaction",
    }),
    Type.Null(),
  ]),
  nonce: Type.Union([
    Type.Number({
      description: "The nonce of the transaction",
    }),
    Type.Null(),
  ]),
  gasLimit: Type.Union([
    Type.String({
      description: "Gas Limit used for the transaction",
    }),
    Type.Null(),
  ]),
  gasPrice: Type.Union([
    Type.String({
      description: "Gas Price used for the transaction",
    }),
    Type.Null(),
  ]),
  maxFeePerGas: Type.Union([
    Type.String({
      description: "Max Fee Per Gas used for the transaction",
    }),
    Type.Null(),
  ]),
  maxPriorityFeePerGas: Type.Union([
    Type.String({
      description: "Max Priority Fee Per Gas used for the transaction",
    }),
    Type.Null(),
  ]),
  transactionType: Type.Union([
    Type.Number({
      description: "Transaction Type",
    }),
    Type.Null(),
  ]),
  transactionHash: Type.Union([
    Type.String({
      description: "Submitted Transaction Hash",
    }),
    Type.Null(),
  ]),
  queuedAt: Type.Union([
    Type.String({
      description: "Transaction Queue Request Timestamp",
    }),
    Type.Null(),
  ]),
  processedAt: Type.Union([
    Type.String({
      description:
        "Transaction Processed Timestamp (happens right before submission timestamp)",
    }),
    Type.Null(),
  ]),
  sentAt: Type.Union([
    Type.String({
      description: "Transaction Submission Timestamp",
    }),
    Type.Null(),
  ]),
  minedAt: Type.Union([
    Type.String({
      description: "Transaction Mined Status Update Timestamp",
    }),
    Type.Null(),
  ]),
  deployedContractAddress: Type.Union([
    Type.String({
      description: "Deployed Contract Address",
    }),
    Type.Null(),
  ]),
  deployedContractType: Type.Union([
    Type.String({
      description: "Deployed Contract Type",
    }),
    Type.Null(),
  ]),
  errorMessage: Type.Union([
    Type.String({
      description: "Error Message",
    }),
    Type.Null(),
  ]),
  blockNumber: Type.Union([
    Type.Number({
      description: "Block Number where the transaction was mined",
    }),
    Type.Null(),
  ]),
  status: Type.Union([
    Type.String({
      description: "Status of the transaction",
      examples: ["processed", "queued", "sent", "errored", "mined"],
    }),
    Type.Null(),
  ]),
});

export enum TransactionStatusEnum {
  Processed = "processed",
  Queued = "queued",
  // TODO: Switch to sent
  Submitted = "sent",
  Errored = "errored",
  Mined = "mined",
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

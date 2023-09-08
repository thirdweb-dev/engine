import { Type } from "@sinclair/typebox";

export const transactionResponseSchema = Type.Object({
  queueId: Type.Optional(
    Type.String({
      description: "Request Identifier",
    }),
  ),
  walletAddress: Type.Optional(
    Type.String({
      description: "Wallet Address used for the transaction",
    }),
  ),
  contractAddress: Type.Optional(
    Type.String({
      description: "Contract Address used for the transaction",
    }),
  ),
  chainId: Type.Optional(
    Type.String({
      description: "Chain ID where the transaction was submitted",
    }),
  ),
  extension: Type.Optional(
    Type.String({
      description: "ThirdWeb Extension type",
    }),
  ),
  status: Type.Optional(
    Type.String({
      description: "Status of the transaction",
      examples: ["processed", "queued", "submitted", "errored", "mined"],
    }),
  ),
  encodedInputData: Type.Optional(
    Type.String({
      description: "Encoded Input Data",
    }),
  ),
  txType: Type.Optional(
    Type.Number({
      description: "Transaction Type",
    }),
  ),
  gasPrice: Type.Optional(
    Type.String({
      description: "Gas Price used for the transaction",
    }),
  ),
  gasLimit: Type.Optional(
    Type.String({
      description: "Gas Limit used for the transaction",
    }),
  ),
  maxPriorityFeePerGas: Type.Optional(
    Type.String({
      description: "Max Priority Fee Per Gas used for the transaction",
    }),
  ),
  maxFeePerGas: Type.Optional(
    Type.String({
      description: "Max Fee Per Gas used for the transaction",
    }),
  ),
  txHash: Type.Optional(
    Type.String({
      description: "Submitted Transaction Hash",
    }),
  ),
  submittedTxNonce: Type.Optional(
    Type.Number({
      description: "Submitted Transaction Nonce",
    }),
  ),
  createdTimestamp: Type.Optional(
    Type.String({
      description: "Transaction Request Creation Timestamp",
    }),
  ),
  txProcessedTimestamp: Type.Optional(
    Type.String({
      description:
        "Transaction Processed Timestamp (happens right before submission timestamp)",
    }),
  ),
  txSubmittedTimestamp: Type.Optional(
    Type.String({
      description: "Transaction Submission Timestamp",
    }),
  ),
  deployedContractAddress: Type.Optional(
    Type.String({
      description: "Deployed Contract Address",
    }),
  ),
  contractType: Type.Optional(
    Type.String({
      description: "Deployed Contract Type",
    }),
  ),
  errorMessage: Type.Optional(
    Type.String({
      description: "Error Message",
    }),
  ),
  txMinedTimestamp: Type.Optional(
    Type.String({
      description: "Transaction Mined Status Update Timestamp",
    }),
  ),
  blockNumber: Type.Optional(
    Type.Number({
      description: "Block Number where the transaction was mined",
    }),
  ),
});

export enum TransactionStatusEnum {
  Processed = "processed",
  Queued = "queued",
  Submitted = "submitted",
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
}

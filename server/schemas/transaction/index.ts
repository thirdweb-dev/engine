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
  functionName: Type.Optional(
    Type.String({
      description: "Function Name that was interacted with on the contract",
    }),
  ),
  functionArgs: Type.Optional(
    Type.String({
      description: "Function Arguments that were passed to the contract",
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
  txSubmittedTimestamp: Type.Optional(
    Type.String({
      description: "Transaction Submission Timestamp",
    }),
  ),
});

transactionResponseSchema.examples = [
  {
    result: [
      {
        queueId: "d09e5849-a262-4f0f-84be-55389c6c7bce",
        walletAddress: "0x1946267d81fb8adeeea28e6b98bcd446c8248473",
        contractAddress: "0x365b83d67d5539c6583b9c0266a548926bf216f4",
        chainId: "80001",
        extension: "non-extension",
        functionName: "transfer",
        functionArgs: "0x3EcDBF3B911d0e9052b64850693888b008e18373,1000000",
        status: "submitted",
        encodedInputData:
          "0xa9059cbb0000000000000000000000003ecdbf3b911d0e9052b64850693888b008e1837300000000000000000000000000000000000000000000000000000000000f4240",
        txType: 2,
        gasPrice: "",
        gasLimit: "46512",
        maxPriorityFeePerGas: "1500000000",
        maxFeePerGas: "1500000032",
        txHash:
          "0x6b63bbe29afb2813e8466c0fc48b22f6c2cc835de8b5fd2d9815c28f63b2b701",
        submittedTxNonce: "562",
        createdTimestamp: "2023-06-01T18:56:50.787Z",
        txSubmittedTimestamp: "2023-06-01T18:56:54.908Z",
      },
    ],
  },
];

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
  createdTimestamp?: string;
  txSubmittedTimestamp?: string;
  submittedTxNonce?: number;
}

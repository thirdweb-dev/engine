import { Static, Type } from "@sinclair/typebox";
import superjson from "superjson";
import { type TransactionType } from "viem";
import { AnyTransaction } from "../../../utils/transaction/types";

export const TransactionSchema = Type.Object({
  queueId: Type.Union([
    Type.String({
      description: "An identifier for an enqueued blockchain write call",
    }),
    Type.Null(),
  ]),
  status: Type.Union(
    [
      Type.Literal("queued"),
      Type.Literal("sent"),
      Type.Literal("mined"),
      Type.Literal("errored"),
      Type.Literal("cancelled"),
    ],
    {
      description: "The current state of the transaction.",
      examples: ["queued", "sent", "mined", "errored", "cancelled"],
    },
  ),
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

export const toTransactionSchema = (
  transaction: AnyTransaction,
): Static<typeof TransactionSchema> => {
  // Helper resolver methods.
  const resolveTransactionType = (type: TransactionType) => {
    switch (type) {
      case "eip2930":
        return 1;
      case "eip1559":
        return 2;
      case "eip4844":
        return 3;
      default:
        return 0;
    }
  };

  const resolveOnchainStatus = (onchainStatus: "success" | "reverted") =>
    onchainStatus === "success" ? 1 : 0;

  const resolveFunctionArgs = (functionArgs?: any[]) => {
    if (functionArgs) {
      const { json } = superjson.serialize(transaction.functionArgs);
      if (json) {
        return json.toString();
      }
    }
    return null;
  };

  return {
    queueId: transaction.queueId,
    status: transaction.status,

    chainId: transaction.chainId.toString(),
    fromAddress: transaction.from,
    toAddress: transaction.to ?? null,
    data: transaction.data ?? null,
    value: transaction.value.toString(),
    nonce: "nonce" in transaction ? transaction.nonce ?? null : null,
    deployedContractAddress: transaction.deployedContractAddress ?? null,
    deployedContractType: transaction.deployedContractType ?? null,
    functionName: transaction.functionName ?? null,
    functionArgs: resolveFunctionArgs(transaction.functionArgs),
    extension: transaction.extension ?? null,

    gasLimit: transaction.gas?.toString() ?? null,
    gasPrice: transaction.gasPrice?.toString() ?? null,
    maxFeePerGas: transaction.maxFeePerGas?.toString() ?? null,
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString() ?? null,
    transactionType:
      "transactionType" in transaction
        ? resolveTransactionType(transaction.transactionType)
        : null,
    transactionHash:
      "transactionHash" in transaction ? transaction.transactionHash : null,
    queuedAt: transaction.queuedAt.toISOString(),
    sentAt: "sentAt" in transaction ? transaction.sentAt.toISOString() : null,
    minedAt:
      "minedAt" in transaction ? transaction.minedAt.toISOString() : null,
    cancelledAt:
      "cancelledAt" in transaction
        ? transaction.cancelledAt.toISOString()
        : null,
    errorMessage:
      "errorMessage" in transaction ? transaction.errorMessage : null,
    sentAtBlockNumber:
      "sentAtBlock" in transaction ? Number(transaction.sentAtBlock) : null,
    blockNumber:
      "minedAtBlock" in transaction ? Number(transaction.minedAtBlock) : null,
    retryCount: "retryCount" in transaction ? transaction.retryCount : 0,
    onChainTxStatus:
      "onchainStatus" in transaction
        ? resolveOnchainStatus(transaction.onchainStatus)
        : null,

    // @TODO: handle userOps
    signerAddress: null,
    accountAddress: null,
    target: null,
    sender: null,
    initCode: null,
    callData: null,
    callGasLimit: null,
    verificationGasLimit: null,
    preVerificationGas: null,
    paymasterAndData: null,
    userOpHash: null,

    // Deprecated
    retryGasValues: null,
    retryMaxFeePerGas: null,
    retryMaxPriorityFeePerGas: null,
  };
};

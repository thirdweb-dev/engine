import { Type, type Static } from "@sinclair/typebox";
import type { Hex } from "thirdweb";
import { stringify } from "thirdweb/utils";
import type { AnyTransaction } from "../../../utils/transaction/types";
import { AddressSchema, TransactionHashSchema } from "../address";

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
    Type.Integer({
      description: "The nonce used by the backend wallet for this transaction",
    }),
    Type.String({
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
    Type.Integer({
      description: "The type of transaction",
    }),
    Type.Null(),
  ]),
  transactionHash: Type.Union([TransactionHashSchema, Type.Null()]),
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
    Type.Integer({
      description:
        "The block number when the transaction is submitted to mempool",
    }),
    Type.Null(),
  ]),
  blockNumber: Type.Union([
    Type.Integer({
      description: "The block number when the transaction is mined",
    }),
    Type.Null(),
  ]),
  retryCount: Type.Integer({
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
  signerAddress: Type.Union([AddressSchema, Type.Null()]),
  accountAddress: Type.Union([AddressSchema, Type.Null()]),
  accountSalt: Type.Union([Type.String(), Type.Null()]),
  accountFactoryAddress: Type.Union([AddressSchema, Type.Null()]),
  target: Type.Union([AddressSchema, Type.Null()]),
  sender: Type.Union([AddressSchema, Type.Null()]),
  initCode: Type.Union([Type.String(), Type.Null()]),
  callData: Type.Union([Type.String(), Type.Null()]),
  callGasLimit: Type.Union([Type.String(), Type.Null()]),
  verificationGasLimit: Type.Union([Type.String(), Type.Null()]),
  preVerificationGas: Type.Union([Type.String(), Type.Null()]),
  paymasterAndData: Type.Union([Type.String(), Type.Null()]),
  userOpHash: Type.Union([TransactionHashSchema, Type.Null()]),
  functionName: Type.Union([Type.String(), Type.Null()]),
  functionArgs: Type.Union([Type.String(), Type.Null()]),
  // @deprecated
  onChainTxStatus: Type.Union([Type.Integer(), Type.Null()]),
  onchainStatus: Type.Union([
    Type.Literal("success"),
    Type.Literal("reverted"),
    Type.Null(),
  ]),
  effectiveGasPrice: Type.Union([
    Type.String({
      description: "Effective Gas Price",
    }),
    Type.Null(),
  ]),
  cumulativeGasUsed: Type.Union([
    Type.String({
      description: "Cumulative Gas Used",
    }),
    Type.Null(),
  ]),
});

export const toTransactionSchema = (
  transaction: AnyTransaction,
): Static<typeof TransactionSchema> => {
  // Helper resolver methods.
  const resolveTransactionType = () => {
    if (transaction.status === "mined") {
      switch (transaction.transactionType) {
        case "eip2930":
          return 1;
        case "eip1559":
          return 2;
        case "eip4844":
          return 3;
        default:
          return 0;
      }
    }
    return null;
  };

  const resolveOnchainTxStatus = () => {
    if (transaction.status === "mined") {
      return transaction.onchainStatus === "success" ? 1 : 0;
    }
    return null;
  };

  const resolveFunctionArgs = () =>
    transaction.functionArgs ? stringify(transaction.functionArgs) : null;

  const resolveTransactionHash = (): string | null => {
    switch (transaction.status) {
      case "sent":
        if (!transaction.isUserOp) {
          return transaction.sentTransactionHashes.at(-1) ?? null;
        }
        break;
      case "mined":
        return transaction.transactionHash;
    }
    return null;
  };

  const resolveGas = (): string | null => {
    if (transaction.status === "sent") {
      return transaction.gas.toString();
    }
    return transaction.overrides?.gas?.toString() ?? null;
  };

  const resolveGasPrice = (): string | null => {
    if (transaction.status === "sent") {
      return transaction.gasPrice?.toString() ?? null;
    }
    return transaction.overrides?.gasPrice?.toString() ?? null;
  };

  const resolveMaxFeePerGas = (): string | null => {
    if (transaction.status === "sent") {
      return transaction.maxFeePerGas?.toString() ?? null;
    }
    return transaction.overrides?.maxFeePerGas?.toString() ?? null;
  };

  const resolveMaxPriorityFeePerGas = (): string | null => {
    if (transaction.status === "sent") {
      return transaction.maxPriorityFeePerGas?.toString() ?? null;
    }
    return transaction.overrides?.maxPriorityFeePerGas?.toString() ?? null;
  };

  return {
    queueId: transaction.queueId,
    status: transaction.status,

    chainId: transaction.chainId.toString(),
    fromAddress: transaction.from,
    toAddress: transaction.to ?? null,
    data: transaction.data ?? null,
    value: transaction.value.toString(),
    nonce:
      "nonce" in transaction && transaction.nonce !== undefined
        ? transaction.nonce
        : null,
    deployedContractAddress: transaction.deployedContractAddress ?? null,
    deployedContractType: transaction.deployedContractType ?? null,
    functionName: transaction.functionName ?? null,
    functionArgs: resolveFunctionArgs(),
    extension: transaction.extension ?? null,

    gasLimit: resolveGas(),
    gasPrice: resolveGasPrice(),
    maxFeePerGas: resolveMaxFeePerGas(),
    maxPriorityFeePerGas: resolveMaxPriorityFeePerGas(),
    transactionType: resolveTransactionType(),
    transactionHash: resolveTransactionHash(),
    queuedAt: transaction.queuedAt.toISOString(),
    sentAt: "sentAt" in transaction ? transaction.sentAt.toISOString() : null,
    minedAt:
      "minedAt" in transaction ? transaction.minedAt.toISOString() : null,
    cancelledAt:
      "cancelledAt" in transaction
        ? transaction.cancelledAt.toISOString()
        : null,
    errorMessage:
      "errorMessage" in transaction ? (transaction.errorMessage ?? null) : null,
    sentAtBlockNumber:
      "sentAtBlock" in transaction ? Number(transaction.sentAtBlock) : null,
    blockNumber:
      "minedAtBlock" in transaction ? Number(transaction.minedAtBlock) : null,
    retryCount: "retryCount" in transaction ? transaction.resendCount : 0,
    onChainTxStatus: resolveOnchainTxStatus(),
    onchainStatus:
      "onchainStatus" in transaction ? transaction.onchainStatus : null,
    effectiveGasPrice:
      "effectiveGasPrice" in transaction && transaction.effectiveGasPrice
        ? transaction.effectiveGasPrice.toString()
        : null,
    cumulativeGasUsed:
      "cumulativeGasUsed" in transaction && transaction.cumulativeGasUsed
        ? transaction.cumulativeGasUsed.toString()
        : null,

    // User Operation
    signerAddress: transaction.from,
    accountAddress: transaction.accountAddress ?? null,
    accountSalt: transaction.accountSalt ?? null,
    accountFactoryAddress: transaction.accountFactoryAddress ?? null,
    target: transaction.target ?? null,
    sender: transaction.sender ?? null,
    initCode: null,
    callData: null,
    callGasLimit: null,
    verificationGasLimit: null,
    preVerificationGas: null,
    paymasterAndData: null,
    userOpHash:
      "userOpHash" in transaction ? (transaction.userOpHash as Hex) : null,

    // Deprecated
    retryGasValues: null,
    retryMaxFeePerGas: null,
    retryMaxPriorityFeePerGas: null,
  };
};

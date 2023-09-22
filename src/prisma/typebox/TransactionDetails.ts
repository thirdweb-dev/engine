import { Type, Static } from "@sinclair/typebox";

export const TransactionDetails = Type.Object({
  id: Type.String(),
  transaction: Type.Object({
    id: Type.String(),
    chainId: Type.Number(),
    queuedAt: Type.Optional(Type.String()),
    processedAt: Type.Optional(Type.String()),
    sentAt: Type.Optional(Type.String()),
    minedAt: Type.Optional(Type.String()),
    retryCount: Type.Optional(Type.Number()),
    errorMessage: Type.Optional(Type.String()),
    functionName: Type.Optional(Type.String()),
    functionArgs: Type.Optional(Type.String()),
    extension: Type.Optional(Type.String()),
    deployedContractAddress: Type.Optional(Type.String()),
    deployedContractType: Type.Optional(Type.String()),
  }),
  fromAddress: Type.String(),
  toAddress: Type.Optional(Type.String()),
  data: Type.Optional(Type.String()),
  value: Type.Optional(Type.String()),
  gasLimit: Type.Optional(Type.String()),
  nonce: Type.Optional(Type.Number()),
  gasPrice: Type.Optional(Type.String()),
  maxFeePerGas: Type.Optional(Type.String()),
  maxPriorityFeePerGas: Type.Optional(Type.String()),
  transactionType: Type.Optional(Type.Number()),
  transactionHash: Type.Optional(Type.String()),
  sentAtBlockNumber: Type.Optional(Type.Number()),
  retryGasValues: Type.Optional(Type.Boolean()),
  retryMaxPriorityFeePerGas: Type.Optional(Type.String()),
  retryMaxFeePerGas: Type.Optional(Type.String()),
  minedAtBlockNumber: Type.Optional(Type.Number()),
});

export type TransactionDetailsType = Static<typeof TransactionDetails>;

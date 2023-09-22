import { Type, Static } from "@sinclair/typebox";
import { TransactionType } from "./TransactionType";

export const Transaction = Type.Object({
  id: Type.String(),
  chainId: Type.Number(),
  type: TransactionType,
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
  transactionDetails: Type.Optional(
    Type.Object({
      id: Type.String(),
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
    })
  ),
  userOperation: Type.Optional(
    Type.Object({
      id: Type.String(),
      signerAddress: Type.String(),
      accountAddress: Type.String(),
      target: Type.Optional(Type.String()),
      data: Type.Optional(Type.String()),
      value: Type.Optional(Type.String()),
      gasLimit: Type.Optional(Type.String()),
      sender: Type.Optional(Type.String()),
      nonce: Type.Optional(Type.Number()),
      initCode: Type.Optional(Type.String()),
      callData: Type.Optional(Type.String()),
      callGasLimit: Type.Optional(Type.Number()),
      verificationGasLimit: Type.Optional(Type.Number()),
      preVerificationGas: Type.Optional(Type.Number()),
      maxFeePerGas: Type.Optional(Type.Number()),
      maxPriorityFeePerGas: Type.Optional(Type.Number()),
      paymasterAndData: Type.Optional(Type.String()),
      userOpHash: Type.Optional(Type.String()),
      sentAtBlockNumber: Type.Optional(Type.Number()),
      minedAtBlockNumber: Type.Optional(Type.Number()),
      transactionHash: Type.String(),
    })
  ),
});

export type TransactionType = Static<typeof Transaction>;

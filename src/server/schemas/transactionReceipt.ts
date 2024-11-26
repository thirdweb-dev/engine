import type { ContractTransactionReceipts } from "@prisma/client";
import { type Static, Type } from "@sinclair/typebox";
import { AddressSchema, TransactionHashSchema } from "./address";

export const transactionReceiptSchema = Type.Object({
  chainId: Type.Integer(),
  blockNumber: Type.Integer(),
  contractAddress: AddressSchema,
  transactionHash: TransactionHashSchema,
  blockHash: Type.String(),
  timestamp: Type.Integer(),
  data: Type.String(),
  value: Type.String(),

  to: Type.String(),
  from: Type.String(),
  transactionIndex: Type.Integer(),

  gasUsed: Type.String(),
  effectiveGasPrice: Type.String(),
  status: Type.Integer(),
});

export const toTransactionReceiptSchema = (
  transactionReceipt: ContractTransactionReceipts,
): Static<typeof transactionReceiptSchema> => ({
  chainId: Number.parseInt(transactionReceipt.chainId),
  blockNumber: transactionReceipt.blockNumber,
  contractAddress: transactionReceipt.contractAddress,
  transactionHash: transactionReceipt.transactionHash,
  blockHash: transactionReceipt.blockHash,
  timestamp: transactionReceipt.timestamp.getTime(),
  data: transactionReceipt.data,
  value: transactionReceipt.value,
  to: transactionReceipt.to,
  from: transactionReceipt.from,
  transactionIndex: transactionReceipt.transactionIndex,
  gasUsed: transactionReceipt.gasUsed,
  effectiveGasPrice: transactionReceipt.effectiveGasPrice,
  status: transactionReceipt.status,
});

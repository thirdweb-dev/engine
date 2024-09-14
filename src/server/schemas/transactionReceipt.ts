import { ContractTransactionReceipts } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { AddressSchema } from "./address";

export const transactionReceiptSchema = Type.Object({
  chainId: Type.Number(),
  blockNumber: Type.Number(),
  contractAddress: AddressSchema,
  transactionHash: Type.String(),
  blockHash: Type.String(),
  timestamp: Type.Number(),
  data: Type.String(),
  value: Type.String(),

  to: Type.String(),
  from: Type.String(),
  transactionIndex: Type.Number(),

  gasUsed: Type.String(),
  effectiveGasPrice: Type.String(),
  status: Type.Number(),
});

export const toTransactionReceiptSchema = (
  transactionReceipt: ContractTransactionReceipts,
): Static<typeof transactionReceiptSchema> => ({
  chainId: transactionReceipt.chainId,
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

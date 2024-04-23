import { ContractTransactionReceipts } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";

export const transactionReceiptSchema = Type.Object({
  chainId: Type.Number(),
  blockNumber: Type.Number(),
  contractAddress: Type.String(),
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
  raw: ContractTransactionReceipts,
): Static<typeof transactionReceiptSchema> => ({
  ...raw,
  timestamp: raw.timestamp.getTime(),
});

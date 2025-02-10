import type { ContractEventLogs } from "@prisma/client";
import { Type, type Static } from "@sinclair/typebox";
import { AddressSchema, TransactionHashSchema } from "./address.js";

export const eventLogSchema = Type.Object({
  chainId: Type.Integer(),
  contractAddress: AddressSchema,
  blockNumber: Type.Integer(),
  transactionHash: TransactionHashSchema,
  topics: Type.Array(Type.String()),
  data: Type.String(),
  eventName: Type.Optional(Type.String()),
  decodedLog: Type.Any(),
  timestamp: Type.Integer(),
  transactionIndex: Type.Integer(),
  logIndex: Type.Integer(),
});

export const toEventLogSchema = (
  log: ContractEventLogs,
): Static<typeof eventLogSchema> => {
  const topics: string[] = [];
  for (const val of [ log.topic0, log.topic1, log.topic2, log.topic3 ]) {
    if (val) {
      topics.push(val);
    }
  }

  return {
    chainId: Number.parseInt(log.chainId),
    contractAddress: log.contractAddress,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    topics,
    data: log.data,
    eventName: log.eventName ?? undefined,
    decodedLog: log.decodedLog,
    timestamp: log.timestamp.getTime(),
    transactionIndex: log.transactionIndex,
    logIndex: log.logIndex,
  };
};

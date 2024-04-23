import { ContractEventLogs } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";

export const eventLogSchema = Type.Object({
  chainId: Type.Number(),
  contractAddress: Type.String(),
  blockNumber: Type.Number(),
  transactionHash: Type.String(),
  topics: Type.Array(Type.String()),
  data: Type.String(),
  eventName: Type.Optional(Type.String()),
  decodedLog: Type.Any(),
  timestamp: Type.Number(),
  transactionIndex: Type.Number(),
  logIndex: Type.Number(),
});

export const toEventLogSchema = (
  raw: ContractEventLogs,
): Static<typeof eventLogSchema> => {
  const topics: string[] = [];
  for (const topic of [raw.topic0, raw.topic1, raw.topic2, raw.topic3]) {
    if (topic) {
      topics.push(topic);
    }
  }

  return {
    chainId: raw.chainId,
    contractAddress: raw.contractAddress,
    blockNumber: raw.blockNumber,
    transactionHash: raw.transactionHash,
    topics,
    data: raw.data,
    eventName: raw.eventName ?? undefined,
    decodedLog: raw.decodedLog,
    timestamp: raw.timestamp.getTime(),
    transactionIndex: raw.transactionIndex,
    logIndex: raw.logIndex,
  };
};

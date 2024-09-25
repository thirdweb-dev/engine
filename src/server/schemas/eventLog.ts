import { ContractEventLogs } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { AddressSchema } from "./address";

export const eventLogSchema = Type.Object({
  chainId: Type.Number(),
  contractAddress: AddressSchema,
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
  log: ContractEventLogs,
): Static<typeof eventLogSchema> => {
  const topics: string[] = [];
  [log.topic0, log.topic1, log.topic2, log.topic3].forEach((val) => {
    if (val) {
      topics.push(val);
    }
  });

  return {
    chainId: log.chainId,
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

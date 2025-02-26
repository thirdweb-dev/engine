import { BigNumber } from "ethers";
import type { AbiEvent } from "ox";
import type { GetContractEventsResult, PreparedEvent } from "thirdweb";

export type ContractEventV4 = {
  eventName: string;
  data: Record<string, unknown>;
  transaction: {
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;
    removed: boolean;
    address: string;
    data: string;
    topic: string[];
    transactionHash: string;
    logIndex: number;
    event: string;
    eventSignature?: string;
  };
};

/**
 * Mapping of events v5 response to v4 for backward compatiblity.
 * Clients may be using this api and dont want to break things.
 */
export function toContractEventV4Schema(
  eventV5: GetContractEventsResult<
    PreparedEvent<AbiEvent.AbiEvent>[],
    true
  >[number],
): ContractEventV4 {
  const eventName = eventV5.eventName;

  // backwards compatibility of BigInt(v5) to BigNumber(v4)
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(eventV5.args)) {
    // @ts-expect-error - FIXME this is kinda hacky
    let value = eventV5.args[key];
    if (typeof value === "bigint") {
      value = BigNumber.from(value.toString());
    }
    data[key] = value;
  }

  return {
    eventName,
    data,
    transaction: {
      blockNumber: Number(eventV5.blockNumber),
      blockHash: eventV5.blockHash,
      transactionIndex: eventV5.transactionIndex,
      removed: eventV5.removed,
      address: eventV5.address,
      data: eventV5.data,
      topic: eventV5.topics,
      transactionHash: eventV5.transactionHash,
      logIndex: eventV5.logIndex,
      event: eventV5.eventName,
      // todo: eventV5.eventSignature is not returned so ignoring for now
    },
  };
}

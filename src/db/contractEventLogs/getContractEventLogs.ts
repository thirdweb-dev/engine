import { prisma } from "../client";

interface GetContractLogsParams {
  chainId: number;
  contractAddress: string;
  fromBlock: number;
  toBlock?: number;
  topics?: string[];
}

export const getContractEventLogsByBlockAndTopics = async ({
  chainId,
  contractAddress,
  fromBlock,
  toBlock,
  topics,
}: GetContractLogsParams) => {
  const whereClause = {
    chainId,
    contractAddress,
    blockNumber: {
      gte: fromBlock,
      ...(toBlock ? { lte: toBlock } : {}),
    },
    ...(topics && topics.length > 0
      ? {
          OR: [
            { topic0: { in: topics } },
            { topic1: { in: topics } },
            { topic2: { in: topics } },
            { topic3: { in: topics } },
          ],
        }
      : {}),
  };

  return await prisma.contractEventLogs.findMany({
    where: whereClause,
  });
};

interface GetEventLogsByBlockTimestampParams {
  fromBlockTimestamp: number;
  toBlockTimestamp?: number;
  contractAddresses?: string[];
  topics?: string[];
}

export const getEventLogsByBlockTimestamp = async ({
  fromBlockTimestamp,
  toBlockTimestamp,
  contractAddresses,
  topics,
}: GetEventLogsByBlockTimestampParams) => {
  const fromBlockDate = new Date(fromBlockTimestamp);
  const toBlockDate = toBlockTimestamp ? new Date(toBlockTimestamp) : undefined;

  const whereClause = {
    timestamp: {
      gte: fromBlockDate,
      ...(toBlockDate && { lte: toBlockDate }),
    },
    ...(contractAddresses && contractAddresses.length > 0
      ? { contractAddress: { in: contractAddresses } }
      : {}),
    ...(topics && topics.length > 0
      ? {
          OR: [
            { topic0: { in: topics } },
            { topic1: { in: topics } },
            { topic2: { in: topics } },
            { topic3: { in: topics } },
          ],
        }
      : {}),
  };

  return await prisma.contractEventLogs.findMany({
    where: whereClause,
  });
};

interface GetEventLogsByCreationTimestampParams {
  fromCreationTimestamp: number;
  toCreationTimestamp?: number;
  contractAddresses?: string[];
  topics?: string[];
}

export const getEventLogsByCreationTimestamp = async ({
  fromCreationTimestamp,
  toCreationTimestamp,
  contractAddresses,
  topics,
}: GetEventLogsByCreationTimestampParams) => {
  const fromCreationDate = new Date(fromCreationTimestamp);
  const toCreationDate = toCreationTimestamp
    ? new Date(toCreationTimestamp)
    : undefined;

  const whereClause = {
    createdAt: {
      gte: fromCreationDate,
      ...(toCreationDate && { lte: toCreationDate }),
    },
    ...(contractAddresses && contractAddresses.length > 0
      ? { contractAddress: { in: contractAddresses } }
      : {}),
    ...(topics && topics.length > 0
      ? {
          OR: [
            { topic0: { in: topics } },
            { topic1: { in: topics } },
            { topic2: { in: topics } },
            { topic3: { in: topics } },
          ],
        }
      : {}),
  };

  return await prisma.contractEventLogs.findMany({
    where: whereClause,
  });
};

export interface GetContractEventLogsIndexedBlockRangeParams {
  chainId: number;
  contractAddress: string;
}

export const getContractEventLogsIndexedBlockRange = async ({
  chainId,
  contractAddress,
}: GetContractEventLogsIndexedBlockRangeParams) => {
  const result = await prisma.contractEventLogs.aggregate({
    where: {
      chainId,
      contractAddress,
    },
    _min: {
      blockNumber: true,
    },
    _max: {
      blockNumber: true,
    },
  });

  return {
    fromBlock: result._min.blockNumber,
    toBlock: result._max.blockNumber,
  };
};

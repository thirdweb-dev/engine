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

interface GetEventLogsByCursorParams {
  cursor?: {
    createdAt: Date;
    chainId: number;
    blockNumber: number;
    transactionIndex: number;
    logIndex: number;
  };
  limit?: number;
  contractAddresses?: string[];
  topics?: string[];
  maxCreatedAt?: Date;
}

export const getEventLogsByCursor = async ({
  cursor,
  limit = 100,
  contractAddresses,
  topics,
  maxCreatedAt,
}: GetEventLogsByCursorParams) => {
  const whereClause = {
    AND: [
      ...(contractAddresses && contractAddresses.length > 0
        ? [{ contractAddress: { in: contractAddresses } }]
        : []),
      ...(cursor
        ? [
            {
              OR: [
                { createdAt: { gt: cursor.createdAt } },
                {
                  createdAt: { equals: cursor.createdAt },
                  chainId: { gt: cursor.chainId },
                },
                {
                  createdAt: { equals: cursor.createdAt },
                  chainId: { equals: cursor.chainId },
                  blockNumber: { gt: cursor.blockNumber },
                },
                {
                  createdAt: { equals: cursor.createdAt },
                  chainId: { equals: cursor.chainId },
                  blockNumber: { equals: cursor.blockNumber },
                  transactionIndex: { gt: cursor.transactionIndex },
                },
                {
                  createdAt: { equals: cursor.createdAt },
                  chainId: { equals: cursor.chainId },
                  blockNumber: { equals: cursor.blockNumber },
                  transactionIndex: { equals: cursor.transactionIndex },
                  logIndex: { gt: cursor.logIndex },
                },
              ],
            },
          ]
        : []),
      ...(maxCreatedAt
        ? [
            {
              createdAt: {
                lte: maxCreatedAt,
              },
            },
          ]
        : []),
    ],
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

  const logs = await prisma.contractEventLogs.findMany({
    where: whereClause,
    orderBy: [
      { createdAt: "asc" },
      { chainId: "asc" },
      { blockNumber: "asc" },
      { transactionIndex: "asc" },
      { logIndex: "asc" },
    ],
    take: limit,
  });

  return logs;
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

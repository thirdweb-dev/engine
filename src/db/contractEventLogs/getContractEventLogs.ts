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
    },
  } as any;

  if (toBlock) {
    whereClause.AND = {
      blockNumber: {
        lte: toBlock,
      },
    };
  }

  if (topics && topics.length) {
    whereClause.OR = [
      { topic0: { in: topics } },
      { topic1: { in: topics } },
      { topic2: { in: topics } },
      { topic3: { in: topics } },
    ];
  }

  return await prisma.contractEventLogs.findMany({
    where: whereClause,
  });
};

interface GetEventLogsParams {
  chainId: number;
  fromBlock: number;
  toBlock?: number;
  topics?: string[];
}

export const getChainIdEventLogsByBlockAndTopics = async ({
  chainId,
  fromBlock,
  toBlock,
  topics,
}: GetEventLogsParams) => {
  const whereClause = {
    chainId: chainId,
    blockNumber: {
      gte: fromBlock,
    },
  } as any;

  if (toBlock) {
    whereClause.AND = {
      blockNumber: {
        lte: toBlock,
      },
    };
  }

  if (topics && topics.length) {
    whereClause.OR = [
      { topic0: { in: topics } },
      { topic1: { in: topics } },
      { topic2: { in: topics } },
      { topic3: { in: topics } },
    ];
  }

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

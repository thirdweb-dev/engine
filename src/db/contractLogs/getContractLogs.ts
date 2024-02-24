import { prisma } from "../client";

interface GetContractLogsParams {
  chainId: number;
  contractAddress: string;
  fromBlock: number;
  toBlock?: number;
  topics?: string[];
}

export const getContractLogsByBlockAndTopics = async ({
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

  return await prisma.contractLogs.findMany({
    where: whereClause,
  });
};

export const getMinMaxBlockNumber = async (
  chainId: number,
  contractAddress: string,
) => {
  const result = await prisma.contractLogs.aggregate({
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
    minBlockNumber: result._min.blockNumber,
    maxBlockNumber: result._max.blockNumber,
  };
};

import { prisma } from "../client";

interface GetContractTransactionReceiptsParams {
  chainId: number;
  contractAddress: string;
  fromBlock: number;
  toBlock?: number;
}

export const getContractTransactionReceiptsByBlock = async ({
  chainId,
  contractAddress,
  fromBlock,
  toBlock,
}: GetContractTransactionReceiptsParams) => {
  const whereClause = {
    chainId,
    contractAddress,
    blockNumber: {
      gte: fromBlock,
      ...(toBlock ? { lte: toBlock } : {}),
    },
  };

  return await prisma.contractTransactionReceipts.findMany({
    where: whereClause,
  });
};

interface GetContractTransactionReceiptsByBlockTimestampParams {
  fromBlockTimestamp: number;
  toBlockTimestamp?: number;
  contractAddresses?: string[];
}

export const getTransactionReceiptsByBlockTimestamp = async ({
  fromBlockTimestamp,
  toBlockTimestamp,
  contractAddresses,
}: GetContractTransactionReceiptsByBlockTimestampParams) => {
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
  };

  return await prisma.contractTransactionReceipts.findMany({
    where: whereClause,
  });
};

interface GetContractTransactionReceiptsByCursorParams {
  cursor?: {
    createdAt: Date;
    chainId: number;
    blockNumber: number;
    transactionIndex: number;
  };
  limit?: number;
  contractAddresses?: string[];
  maxCreatedAt?: Date;
}

export const getTransactionReceiptsByCursor = async ({
  cursor,
  limit = 100,
  contractAddresses,
  maxCreatedAt,
}: GetContractTransactionReceiptsByCursorParams) => {
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
                  blockNumber: { gt: cursor.blockNumber },
                  transactionIndex: { gt: cursor.transactionIndex },
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
  };

  const logs = await prisma.contractTransactionReceipts.findMany({
    where: whereClause,
    orderBy: [
      { createdAt: "asc" },
      { chainId: "asc" },
      { blockNumber: "asc" },
      { transactionIndex: "asc" },
    ],
    take: limit,
  });

  return logs;
};

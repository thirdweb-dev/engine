import { ContractEventLogs, Prisma } from "@prisma/client";
import base64 from "base-64";
import { z } from "zod";
import { prisma } from "../client";

interface GetContractEventLogsParams {
  chainId: number;
  contractAddresses: string[];
  fromBlock: number;
  toBlock?: number;
  topics?: string[];
}

export const getEventLogsByBlock = async ({
  chainId,
  contractAddresses,
  fromBlock,
  toBlock,
  topics,
}: GetContractEventLogsParams): Promise<ContractEventLogs[]> => {
  const whereClause: Prisma.ContractEventLogsWhereInput = {
    chainId,
    contractAddress: {
      in: contractAddresses,
    },
    blockNumber: {
      gte: fromBlock,
      lte: toBlock,
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

interface GetEventLogsByTimestampParams {
  chainId?: string;
  fromTimestamp: number;
  toTimestamp?: number;
  contractAddresses?: string[];
  topics?: string[];
}

export const getEventLogsByTimestamp = async ({
  fromTimestamp,
  toTimestamp,
  contractAddresses,
  topics,
}: GetEventLogsByTimestampParams): Promise<ContractEventLogs[]> => {
  const whereClause: Prisma.ContractEventLogsWhereInput = {
    timestamp: {
      gte: new Date(fromTimestamp),
      lte: toTimestamp ? new Date(toTimestamp) : undefined,
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
  cursor?: string;
  limit: number;
  contractAddresses?: string[];
  topics?: string[];
  maxCreatedAt?: Date;
}

const CursorSchema = z.object({
  createdAt: z.number().transform((s) => new Date(s)),
  chainId: z.number(),
  blockNumber: z.number(),
  transactionIndex: z.number(),
  logIndex: z.number(),
});

export const getEventLogsByCursor = async ({
  cursor,
  limit,
  contractAddresses,
  topics,
  maxCreatedAt,
}: GetEventLogsByCursorParams): Promise<{
  cursor?: string;
  logs: ContractEventLogs[];
}> => {
  let cursorObj: z.infer<typeof CursorSchema> | null = null;
  if (cursor) {
    const decodedCursor = base64.decode(cursor);
    const parsedCursor = decodedCursor.split("-").map((val) => parseInt(val));
    const [createdAt, chainId, blockNumber, transactionIndex, logIndex] =
      parsedCursor;
    const validationResult = CursorSchema.safeParse({
      createdAt,
      chainId,
      blockNumber,
      transactionIndex,
      logIndex,
    });

    if (!validationResult.success) {
      throw new Error("Invalid cursor format");
    }

    cursorObj = validationResult.data;
  }

  const whereClause: Prisma.ContractEventLogsWhereInput = {
    AND: [
      ...(contractAddresses && contractAddresses.length > 0
        ? [{ contractAddress: { in: contractAddresses } }]
        : []),
      ...(cursorObj
        ? [
            {
              OR: [
                { createdAt: { gt: cursorObj.createdAt } },
                {
                  createdAt: { equals: cursorObj.createdAt },
                  chainId: { gt: cursorObj.chainId },
                },
                {
                  createdAt: { equals: cursorObj.createdAt },
                  chainId: { equals: cursorObj.chainId },
                  blockNumber: { gt: cursorObj.blockNumber },
                },
                {
                  createdAt: { equals: cursorObj.createdAt },
                  chainId: { equals: cursorObj.chainId },
                  blockNumber: { equals: cursorObj.blockNumber },
                  transactionIndex: { gt: cursorObj.transactionIndex },
                },
                {
                  createdAt: { equals: cursorObj.createdAt },
                  chainId: { equals: cursorObj.chainId },
                  blockNumber: { equals: cursorObj.blockNumber },
                  transactionIndex: { equals: cursorObj.transactionIndex },
                  logIndex: { gt: cursorObj.logIndex },
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

  /* cursor rules */
  // if new logs returned, return new cursor
  // if no new logs and no cursor return null (original cursor)
  // if no new logs and cursor return original cursor
  let newCursor = cursor;
  if (logs.length > 0) {
    const lastLog = logs[logs.length - 1];
    const cursorString = `${lastLog.createdAt.getTime()}-${lastLog.chainId}-${
      lastLog.blockNumber
    }-${lastLog.transactionIndex}-${lastLog.logIndex}`;

    newCursor = base64.encode(cursorString);
  }

  return { cursor: newCursor, logs };
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

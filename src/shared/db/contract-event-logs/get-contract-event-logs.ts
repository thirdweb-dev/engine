import base64 from "base-64";
import { z } from "zod";
import { prisma } from "../client.js";

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
    chainId: chainId.toString(),
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
  cursor?: string;
  limit?: number;
  contractAddresses?: string[];
  topics?: string[];
  maxCreatedAt?: Date;
}

/*
  cursor?: {
    createdAt: Date;
    chainId: number;
    blockNumber: number;
    transactionIndex: number;
    logIndex: number;
  };
  */

const CursorSchema = z.object({
  createdAt: z.number().transform((s) => new Date(s)),
  chainId: z.number(),
  blockNumber: z.number(),
  transactionIndex: z.number(),
  logIndex: z.number(),
});

export const getEventLogsByCursor = async ({
  cursor,
  limit = 100,
  contractAddresses,
  topics,
  maxCreatedAt,
}: GetEventLogsByCursorParams) => {
  let cursorObj: z.infer<typeof CursorSchema> | null = null;
  if (cursor) {
    const decodedCursor = base64.decode(cursor);
    const parsedCursor = decodedCursor
      .split("-")
      .map((val) => Number.parseInt(val));
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

  const whereClause = {
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
                  chainId: { gt: cursorObj.chainId.toString() },
                },
                {
                  createdAt: { equals: cursorObj.createdAt },
                  chainId: { equals: cursorObj.chainId.toString() },
                  blockNumber: { gt: cursorObj.blockNumber },
                },
                {
                  createdAt: { equals: cursorObj.createdAt },
                  chainId: { equals: cursorObj.chainId.toString() },
                  blockNumber: { equals: cursorObj.blockNumber },
                  transactionIndex: { gt: cursorObj.transactionIndex },
                },
                {
                  createdAt: { equals: cursorObj.createdAt },
                  chainId: { equals: cursorObj.chainId.toString() },
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

    if (!lastLog) {
      throw new Error("No logs found");
    }

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
      chainId: chainId.toString(),
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

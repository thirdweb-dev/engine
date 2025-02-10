import base64 from "base-64";
import { z } from "zod";
import { prisma } from "../client.js";

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
    chainId: chainId.toString(),
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
  cursor?: string;
  limit?: number;
  contractAddresses?: string[];
  maxCreatedAt?: Date;
}

/*
  cursor?: {
    createdAt: Date;
    chainId: number;
    blockNumber: number;
    transactionIndex: number;
  };
*/

const CursorSchema = z.object({
  createdAt: z.number().transform((s) => new Date(s)),
  chainId: z.number(),
  blockNumber: z.number(),
  transactionIndex: z.number(),
});

export const getTransactionReceiptsByCursor = async ({
  cursor,
  limit = 100,
  contractAddresses,
  maxCreatedAt,
}: GetContractTransactionReceiptsByCursorParams) => {
  let cursorObj: z.infer<typeof CursorSchema> | null = null;
  if (cursor) {
    const decodedCursor = base64.decode(cursor);
    const parsedCursor = decodedCursor
      .split("-")
      .map((val) => Number.parseInt(val));
    const [createdAt, chainId, blockNumber, transactionIndex] = parsedCursor;
    const validationResult = CursorSchema.safeParse({
      createdAt,
      chainId,
      blockNumber,
      transactionIndex,
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
                  blockNumber: { gt: cursorObj.blockNumber },
                  transactionIndex: { gt: cursorObj.transactionIndex },
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

  const transactionReceipts = await prisma.contractTransactionReceipts.findMany(
    {
      where: whereClause,
      orderBy: [
        { createdAt: "asc" },
        { chainId: "asc" },
        { blockNumber: "asc" },
        { transactionIndex: "asc" },
      ],
      take: limit,
    },
  );

  /* cursor rules */
  // if new logs returned, return new cursor
  // if no new logs and no cursor return null (original cursor)
  // if no new logs and cursor return original cursor
  let newCursor = cursor;
  if (transactionReceipts.length > 0) {
    const lastReceipt = transactionReceipts[transactionReceipts.length - 1];

    if (!lastReceipt) {
      throw new Error("No transaction receipts found");
    }

    const cursorString = `${lastReceipt.createdAt.getTime()}-${
      lastReceipt.chainId
    }-${lastReceipt.blockNumber}-${lastReceipt.transactionIndex}`;
    newCursor = base64.encode(cursorString);
  }

  return { cursor: newCursor, transactionReceipts };
};

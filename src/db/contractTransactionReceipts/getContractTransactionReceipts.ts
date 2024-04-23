import { ContractTransactionReceipts, Prisma } from "@prisma/client";
import base64 from "base-64";
import { z } from "zod";
import { prisma } from "../client";

interface GetTransactionReceiptsParams {
  chainId: number;
  addresses: string[];
  fromBlock: number;
  toBlock?: number;
}

export const getTransactionReceiptsByBlock = async ({
  chainId,
  addresses,
  fromBlock,
  toBlock,
}: GetTransactionReceiptsParams): Promise<ContractTransactionReceipts[]> => {
  const whereClause: Prisma.ContractTransactionReceiptsWhereInput = {
    chainId,
    contractAddress: { in: addresses },
    blockNumber: {
      gte: fromBlock,
      lte: toBlock,
    },
  };

  return await prisma.contractTransactionReceipts.findMany({
    where: whereClause,
  });
};

interface GetContractTransactionReceiptsByTimestampParams {
  fromTimestamp: number;
  toTimestamp?: number;
  addresses?: string[];
}

export const getTransactionReceiptsByTimestamp = async ({
  fromTimestamp,
  toTimestamp,
  addresses,
}: GetContractTransactionReceiptsByTimestampParams): Promise<
  ContractTransactionReceipts[]
> => {
  const whereClause: Prisma.ContractTransactionReceiptsWhereInput = {
    timestamp: {
      gte: new Date(fromTimestamp),
      lte: toTimestamp ? new Date(toTimestamp) : undefined,
    },
    ...(addresses && addresses.length > 0
      ? { contractAddress: { in: addresses } }
      : {}),
  };

  return await prisma.contractTransactionReceipts.findMany({
    where: whereClause,
  });
};

interface GetContractTransactionReceiptsByCursorParams {
  cursor?: string;
  limit: number;
  addresses?: string[];
  maxCreatedAt?: Date;
}

const CursorSchema = z.object({
  createdAt: z.number().transform((s) => new Date(s)),
  chainId: z.number(),
  blockNumber: z.number(),
  transactionIndex: z.number(),
});

export const getTransactionReceiptsByCursor = async ({
  cursor,
  limit,
  addresses,
  maxCreatedAt,
}: GetContractTransactionReceiptsByCursorParams): Promise<{
  cursor?: string;
  receipts: ContractTransactionReceipts[];
}> => {
  let cursorObj: z.infer<typeof CursorSchema> | null = null;
  if (cursor) {
    const decodedCursor = base64.decode(cursor);
    const parsedCursor = decodedCursor.split("-").map((val) => parseInt(val));
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

  const whereClause: Prisma.ContractTransactionReceiptsWhereInput = {
    AND: [
      ...(addresses && addresses.length > 0
        ? [{ contractAddress: { in: addresses } }]
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

  const receipts = await prisma.contractTransactionReceipts.findMany({
    where: whereClause,
    orderBy: [
      { createdAt: "asc" },
      { chainId: "asc" },
      { blockNumber: "asc" },
      { transactionIndex: "asc" },
    ],
    take: limit,
  });

  /* cursor rules */
  // if new logs returned, return new cursor
  // if no new logs and no cursor return null (original cursor)
  // if no new logs and cursor return original cursor
  let newCursor = cursor;
  if (receipts.length > 0) {
    const lastReceipt = receipts[receipts.length - 1];
    const cursorString = `${lastReceipt.createdAt.getTime()}-${
      lastReceipt.chainId
    }-${lastReceipt.blockNumber}-${lastReceipt.transactionIndex}`;
    newCursor = base64.encode(cursorString);
  }

  return { cursor: newCursor, receipts };
};

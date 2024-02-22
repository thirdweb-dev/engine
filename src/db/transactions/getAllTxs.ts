import { Prisma } from ".prisma/client";
import { Static } from "@sinclair/typebox";
import { ContractExtension } from "../../schema/extension";
import { PrismaTransaction } from "../../schema/prisma";
import {
  TransactionStatusEnum,
  transactionResponseSchema,
} from "../../server/schemas/transaction";
import { getPrismaWithPostgresTx } from "../client";
import { cleanTxs } from "./cleanTxs";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

interface GetAllTxsParams {
  pgtx?: PrismaTransaction;
  page: number;
  limit: number;
  status?: TransactionStatusEnum;
  fromQueuedAt?: Date;
  extensions?: ContractExtension[];
}

interface GetAllTxsResponse {
  transactions: Static<typeof transactionResponseSchema>[];
  totalCount: number;
}

export const getAllTxs = async ({
  pgtx,
  page,
  limit,
  status,
  fromQueuedAt = new Date(Date.now() - ONE_DAY_IN_MS),
  extensions,
}: GetAllTxsParams): Promise<GetAllTxsResponse> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  let filterQuery: Prisma.TransactionsWhereInput | undefined;
  switch (status) {
    case TransactionStatusEnum.Queued:
      // Not processed yet, no error.
      filterQuery = {
        processedAt: null,
        errorMessage: null,
      };
      break;
    case TransactionStatusEnum.Processed:
      // Processed but not sent, no error.
      filterQuery = {
        processedAt: { not: null },
        sentAt: null,
        errorMessage: null,
      };
      break;
    case TransactionStatusEnum.Submitted:
      // Submitted but not mined, no error.
      filterQuery = {
        sentAt: { not: null },
        minedAt: null,
        errorMessage: null,
      };
      break;
    case TransactionStatusEnum.Mined:
      // Mined, no error.
      filterQuery = {
        minedAt: { not: null },
        errorMessage: null,
      };
      break;
    case TransactionStatusEnum.Errored:
      // Has error.
      filterQuery = {
        errorMessage: { not: null },
      };
      break;
  }

  let extensionsQuery: Prisma.TransactionsWhereInput | undefined;
  if (extensions) {
    extensionsQuery = {
      extension: { in: extensions },
    };
  }

  const totalCountPromise = prisma.transactions.count({
    where: {
      ...filterQuery,
      ...extensionsQuery,
      queuedAt: { gte: fromQueuedAt },
    },
  });

  const txsPromise = prisma.transactions.findMany({
    where: {
      ...filterQuery,
      ...extensionsQuery,
      queuedAt: { gte: fromQueuedAt },
    },
    orderBy: [{ queuedAt: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

  const [totalCount, txs] = await Promise.all([totalCountPromise, txsPromise]);

  return {
    transactions: cleanTxs(txs),
    totalCount: totalCount,
  };
};

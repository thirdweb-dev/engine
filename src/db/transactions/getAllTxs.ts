import { Transactions } from "@prisma/client";
import { Static } from "@sinclair/typebox";
import { ContractExtension } from "../../schema/extension";
import { PrismaTransaction } from "../../schema/prisma";
import {
  TransactionStatus,
  transactionResponseSchema,
} from "../../server/schemas/transaction";
import { getPrismaWithPostgresTx } from "../client";
import { cleanTxs } from "./cleanTxs";

interface GetAllTxsParams {
  pgtx?: PrismaTransaction;
  page: number;
  limit: number;
  filter?: TransactionStatus;
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
  filter,
  extensions,
}: GetAllTxsParams): Promise<GetAllTxsResponse> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  // TODO: To bring this back for Paid feature
  // let filterBy:
  //   | "queuedAt"
  //   | "sentAt"
  //   | "processedAt"
  //   | "minedAt"
  //   | "errorMessage"
  //   | undefined;

  // if (filter === TransactionStatusEnum.Queued) {
  //   filterBy = "queuedAt";
  // } else if (filter === TransactionStatusEnum.Submitted) {
  //   filterBy = "sentAt";
  // } else if (filter === TransactionStatusEnum.Processed) {
  //   filterBy = "processedAt";
  // } else if (filter === TransactionStatusEnum.Mined) {
  //   filterBy = "minedAt";
  // } else if (filter === TransactionStatusEnum.Errored) {
  //   filterBy = "errorMessage";
  // }

  const filterQuery = {
    //   ...(filterBy
    //     ? {
    //         [filterBy]: {
    //           not: null,
    //         },
    //       }
    //     : {}),
    ...(extensions
      ? {
          extension: {
            in: extensions,
          },
        }
      : {}),
  };

  // TODO: Cleaning should be handled by zod
  const totalCountPromise: Promise<number> = prisma.transactions.count({
    where: {
      ...filterQuery,
      queuedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  // TODO: Cleaning should be handled by zod
  const txsPromise: Promise<Transactions[]> = prisma.transactions.findMany({
    where: {
      ...filterQuery,
      queuedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    orderBy: [
      {
        queuedAt: "desc",
      },
    ],
    skip: (page - 1) * limit,
    take: limit,
  });

  const [totalCount, txs] = await Promise.all([totalCountPromise, txsPromise]);

  return {
    transactions: cleanTxs(txs),
    totalCount: totalCount,
  };
};

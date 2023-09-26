import { Transactions } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { env } from "../../utils/env";
import { getPrismaWithPostgresTx } from "../client";

interface GetSentTxsParams {
  pgtx?: PrismaTransaction;
}

export const getSentTxs = async ({ pgtx }: GetSentTxsParams = {}): Promise<
  Transactions[]
> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  return prisma.transactions.findMany({
    where: {
      processedAt: {
        not: null,
      },
      sentAt: {
        not: null,
      },
      transactionHash: {
        not: null,
      },
      accountAddress: null,
      minedAt: null,
      errorMessage: null,
      retryCount: {
        // TODO: What should the max retries be here?
        lt: 3,
      },
    },
    orderBy: [
      {
        sentAt: "asc",
      },
    ],
    // TODO: Should this be coming from env?
    take: env.MIN_TX_TO_CHECK_FOR_MINED_STATUS,
  });
};

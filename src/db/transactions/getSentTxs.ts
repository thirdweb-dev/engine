import { Transactions } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { getConfiguration } from "../configuration/getConfiguration";

interface GetSentTxsParams {
  pgtx?: PrismaTransaction;
}

export const getSentTxs = async ({ pgtx }: GetSentTxsParams = {}): Promise<
  Transactions[]
> => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const config = await getConfiguration();

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
    take: config.maxTxsToUpdate,
  });
};

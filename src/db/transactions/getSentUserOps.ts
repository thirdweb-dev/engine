import { Transactions } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { env } from "../../utils/env";
import { getPrismaWithPostgresTx } from "../client";

interface GetSentUserOpsParams {
  pgtx?: PrismaTransaction;
}

export const getSentUserOps = async ({
  pgtx,
}: GetSentUserOpsParams = {}): Promise<Transactions[]> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  return prisma.transactions.findMany({
    where: {
      processedAt: {
        not: null,
      },
      sentAt: {
        not: null,
      },
      accountAddress: {
        not: null,
      },
      userOpHash: {
        not: null,
      },
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
    take: env.MIN_TX_TO_CHECK_FOR_MINED_STATUS,
  });
};

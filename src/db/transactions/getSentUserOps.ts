import { Transactions } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { getConfiguration } from "../configuration/getConfiguration";

interface GetSentUserOpsParams {
  pgtx?: PrismaTransaction;
}

export const getSentUserOps = async ({
  pgtx,
}: GetSentUserOpsParams = {}): Promise<Transactions[]> => {
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
    take: config.maxTxsToUpdate,
  });
};

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

  return prisma.$queryRaw`
    SELECT * FROM "transactions"
    WHERE "processedAt" IS NOT NULL
    AND "sentAt" IS NOT NULL
    AND "transactionHash" IS NOT NULL
    AND "accountAddress" IS NULL
    AND "minedAt" IS NULL
    AND "errorMessage" IS NULL
    AND "retryCount" < ${config.maxTxsToUpdate}
    ORDER BY "sentAt" ASC
    LIMIT ${config.maxTxsToUpdate}
    FOR UPDATE SKIP LOCKED
  `;
};

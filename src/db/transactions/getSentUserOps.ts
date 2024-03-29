import { Transactions } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getConfig } from "../../utils/cache/getConfig";
import { getPrismaWithPostgresTx } from "../client";

interface GetSentUserOpsParams {
  pgtx?: PrismaTransaction;
}

export const getSentUserOps = async ({
  pgtx,
}: GetSentUserOpsParams = {}): Promise<Transactions[]> => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const config = await getConfig();

  return prisma.$queryRaw<Transactions[]>`
    SELECT * FROM "transactions"
    WHERE "sentAt" IS NOT NULL
    AND "accountAddress" IS NOT NULL
    AND "userOpHash" IS NOT NULL
    AND "minedAt" IS NULL
    AND "errorMessage" IS NULL
    AND "retryCount" < 3
    ORDER BY "sentAt" ASC
    LIMIT ${config.maxTxsToUpdate}
    FOR UPDATE SKIP LOCKED;
  `;
};

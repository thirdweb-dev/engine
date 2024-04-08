import { Transactions } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getConfig } from "../../utils/cache/getConfig";
import { getPrismaWithPostgresTx } from "../client";

interface GetSentTxsParams {
  pgtx?: PrismaTransaction;
}

export const getSentTxs = async ({ pgtx }: GetSentTxsParams = {}): Promise<
  Transactions[]
> => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const config = await getConfig();

  return prisma.$queryRaw<Transactions[]>`
    SELECT * FROM "transactions"
    WHERE "sentAt" IS NOT NULL
    AND "transactionHash" IS NOT NULL
    AND "accountAddress" IS NULL
    AND "minedAt" IS NULL
    AND "errorMessage" IS NULL
    ORDER BY "nonce" ASC
    LIMIT ${config.maxTxsToUpdate}
    FOR UPDATE SKIP LOCKED
  `;
};

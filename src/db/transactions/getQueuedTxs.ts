import { Transactions } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getConfig } from "../../utils/cache/getConfig";
import { getPrismaWithPostgresTx } from "../client";

interface GetQueuedTxsParams {
  pgtx?: PrismaTransaction;
}

export const getQueuedTxs = async ({ pgtx }: GetQueuedTxsParams = {}): Promise<
  Transactions[]
> => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const config = await getConfig();

  // TODO: Don't use env var for transactions to batch
  const txs = await prisma.$queryRaw<Transactions[]>`
  SELECT
    *
  FROM
    "transactions"
  WHERE
    "sentAt" IS NULL
    AND "minedAt" IS NULL
    AND "cancelledAt" IS NULL
    AND "errorMessage" IS NULL
  ORDER BY
    "queuedAt"
  ASC
  LIMIT
    ${config.maxTxsToProcess}
  FOR UPDATE SKIP LOCKED
  `;

  return txs;
};

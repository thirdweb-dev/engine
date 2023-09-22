import { Action } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { env } from "../../utils/env";
import { getPrismaWithPostgresTx } from "../client";

interface GetQueuedTxsParams {
  pgtx?: PrismaTransaction;
}

export const getQueuedActions = async ({
  pgtx,
}: GetQueuedTxsParams = {}): Promise<Action[]> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  // TODO: Don't use env var for transactions to batch
  const actions: Action[] = await prisma.$queryRaw`
SELECT
  *
FROM
  "actions"
WHERE
  "processedAt" IS NULL
  AND "sentAt" IS NULL
  AND "minedAt" IS NULL
ORDER BY
  "queuedAt"
ASC
LIMIT
  ${env.TRANSACTIONS_TO_BATCH}
FOR UPDATE SKIP LOCKED
  `;

  return actions;
};

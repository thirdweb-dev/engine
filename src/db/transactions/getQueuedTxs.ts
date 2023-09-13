import { Static } from "@sinclair/typebox";
import { env } from "../../../core/env";
import { transactionResponseSchema } from "../../../server/schemas/transaction";
import { prisma } from "../client";
import { cleanTxs } from "./cleanTxs";

export const getQueuedTxs = async (): Promise<
  Static<typeof transactionResponseSchema>[]
> => {
  // TODO: Don't use env var for transactions to batch
  const txs = await prisma.$queryRaw`
SELECT
  *
FROM
  "transactions"
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

  // TODO: This might not work!
  return cleanTxs(txs as any);
};

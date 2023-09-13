import { Static } from "@sinclair/typebox";
import { transactionResponseSchema } from "../../../server/schemas/transaction";
import { prisma } from "../client";
import { cleanTxs } from "./cleanTxs";

export const getTxToRetry = async (): Promise<
  Static<typeof transactionResponseSchema>[]
> => {
  // TODO: Why is this checking that transaction hash is not null
  const txs = await prisma.$queryRaw`
SELECT
  *
FROM
  "transactions"
WHERE
  "processedAt" IS NOT NULL
  AND "sentAt" IS NOT NULL
  AND "minedAt" IS NULL
  AND "errorMessage" IS NULL
  AND "transactionHash" IS NOT NULL
  AND "retryCount" < 3
ORDER BY
  "sentAt"
ASC
LIMIT
  1
FOR UPDATE SKIP LOCKED
  `;

  // TODO: This might not work!
  return cleanTxs(txs as any);
};

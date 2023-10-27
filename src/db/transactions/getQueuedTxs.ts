import { Static } from "@sinclair/typebox";
import { PrismaTransaction } from "../../schema/prisma";
import { transactionResponseSchema } from "../../server/schemas/transaction";
import { getPrismaWithPostgresTx } from "../client";
import { getConfiguration } from "../configuration/getConfiguration";
import { cleanTxs } from "./cleanTxs";

interface GetQueuedTxsParams {
  pgtx?: PrismaTransaction;
}

export const getQueuedTxs = async ({ pgtx }: GetQueuedTxsParams = {}): Promise<
  Static<typeof transactionResponseSchema>[]
> => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const config = await getConfiguration();

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
  AND "cancelledAt" IS NULL
ORDER BY
  "queuedAt"
ASC
LIMIT
  ${config.maxTxsToProcess}
FOR UPDATE SKIP LOCKED
  `;

  // TODO: This might not work!
  return cleanTxs(txs as any);
};

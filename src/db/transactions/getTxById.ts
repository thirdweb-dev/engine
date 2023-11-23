import { Transactions } from "@prisma/client";
import { Static } from "@sinclair/typebox";
import { PrismaTransaction } from "../../schema/prisma";
import { transactionResponseSchema } from "../../server/schemas/transaction";
import { getPrismaWithPostgresTx } from "../client";
import { cleanTxs } from "./cleanTxs";

interface GetTxByIdParams {
  queueId: string;
  pgtx?: PrismaTransaction;
}

export const getTxById = async ({
  pgtx,
  queueId,
}: GetTxByIdParams): Promise<Static<
  typeof transactionResponseSchema
> | null> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const tx: Transactions[] = await prisma.$queryRaw`
    SELECT
    *
    FROM
    "transactions"
    WHERE
      "id" = ${queueId}
    LIMIT 1
    FOR UPDATE SKIP LOCKED`;

  if (tx.length === 0 || !tx) {
    return null;
  }

  const [cleanedTx] = cleanTxs(tx);
  return cleanedTx;
};

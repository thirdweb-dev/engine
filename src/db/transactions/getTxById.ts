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
  let tx: Transactions[] | null;

  if (!pgtx) {
    tx = await prisma.$queryRaw<Transactions[]>`
      SELECT * FROM "transactions"
      WHERE
        "id" = ${queueId}
      LIMIT 1`;
  } else {
    tx = await prisma.$queryRaw<Transactions[]>`
      SELECT * FROM "transactions"
      WHERE
        "id" = ${queueId}
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
  }

  if (!tx || tx.length === 0) {
    return null;
  }

  const [cleanedTx] = cleanTxs(tx);
  return cleanedTx;
};

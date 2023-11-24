import { Static } from "@sinclair/typebox";
import { PrismaTransaction } from "../../schema/prisma";
import { transactionResponseSchema } from "../../server/schemas/transaction";
import { prisma } from "../client";
import { cleanTxs } from "./cleanTxs";
interface GetTxByIdsParams {
  queueIds: string[];
  pgtx?: PrismaTransaction;
}

export const getTxByIds = async ({
  queueIds,
}: GetTxByIdsParams): Promise<
  Static<typeof transactionResponseSchema>[] | null
> => {
  const tx = await prisma.transactions.findMany({
    where: {
      id: {
        in: queueIds,
      },
    },
  });

  if (!tx || tx.length === 0) {
    return null;
  }

  const cleanedTx = cleanTxs(tx);
  return cleanedTx;
};

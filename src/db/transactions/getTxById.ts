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

  const tx = await prisma.transactions.findUnique({
    where: {
      id: queueId,
    },
  });
  if (!tx) {
    return null;
  }

  const [cleanedTx] = cleanTxs([tx]);
  return cleanedTx;
};

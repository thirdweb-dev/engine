import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface CheckIfTxCancelledParams {
  pgtx?: PrismaTransaction;
  queueId: string;
}

export const checkIfIDCancelled = async ({
  pgtx,
  queueId,
}: CheckIfTxCancelledParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const tx = await prisma.cancelledTransactions.findFirst({
    where: {
      queueId,
    },
  });

  return tx;
};

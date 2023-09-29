import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface CreateCancelledTxDataParams {
  pgtx?: PrismaTransaction;
  queueId: string;
}

export const createCancelledTxData = async ({
  pgtx,
  queueId,
}: CreateCancelledTxDataParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  return prisma.cancelledTransactions.create({
    data: {
      queueId,
    },
  });
};

import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface UpdateCancelStatusParams {
  pgtx?: PrismaTransaction;
  queueId: string;
}

export const updateCancelStatus = async ({
  pgtx,
  queueId,
}: UpdateCancelStatusParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  return prisma.cancelledTransactions.update({
    where: {
      queueId,
    },
    data: {
      cancelledByWorkerAt: new Date(),
    },
  });
};

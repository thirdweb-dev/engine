import { Prisma } from "@prisma/client";
import { prisma } from "../client";

interface updateTransactionsByQueueIdsParams {
  data: Prisma.TransactionsUpdateInput;
  queueIds: string[];
}

export const updateTransactionsByQueueIds = async ({
  data,
  queueIds,
}: updateTransactionsByQueueIdsParams) => {
  const result = await prisma.transactions.updateMany({
    data,
    where: {
      id: { in: queueIds },
    },
  });
  return result.count;
};

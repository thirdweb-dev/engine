import { Transactions } from "@prisma/client";
import { prisma } from "../client";

export const getTransactionsByQueueIds = async (
  queueIds: string[],
): Promise<Transactions[]> => {
  return await prisma.transactions.findMany({
    where: {
      id: { in: queueIds },
    },
  });
};

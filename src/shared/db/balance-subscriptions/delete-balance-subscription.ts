import { prisma } from "../client";

export async function deleteBalanceSubscription(id: string) {
  return await prisma.balanceSubscriptions.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
    include: {
      webhook: true,
    },
  });
} 
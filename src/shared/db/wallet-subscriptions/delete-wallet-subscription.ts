import { prisma } from "../client";

export async function deleteWalletSubscription(id: string) {
  return await prisma.walletSubscriptions.update({
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
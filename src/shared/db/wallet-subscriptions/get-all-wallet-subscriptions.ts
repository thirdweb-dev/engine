import { validateConditions } from "../../schemas/wallet-subscription-conditions";
import { prisma } from "../client";

export async function getAllWalletSubscriptions({
  page,
  limit,
}: {
  page: number;
  limit: number;
}) {
  const subscriptions = await prisma.walletSubscriptions.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      webhook: true,
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      updatedAt: "desc",
    },
  });

  return subscriptions.map((subscription) => ({
    ...subscription,
    conditions: validateConditions(subscription.conditions),
  }));
}

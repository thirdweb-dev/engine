import { validateConditions } from "../../schemas/wallet-subscription-conditions";
import { prisma } from "../client";

export async function getAllWalletSubscriptions(args?: {
  page?: number;
  limit?: number;
}) {
  const { page, limit } = args || {};
  const subscriptions = await prisma.walletSubscriptions.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      webhook: true,
    },
    skip: page && limit ? (page - 1) * limit : undefined,
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

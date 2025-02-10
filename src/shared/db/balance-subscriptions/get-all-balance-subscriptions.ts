import { parseBalanceSubscriptionConfig } from "../../schemas/balance-subscription-config";
import { prisma } from "../client";

export async function getAllBalanceSubscriptions() {
  const subscriptions = await prisma.balanceSubscriptions.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      webhook: true,
    },
  });

  return subscriptions.map((subscription) => ({
    ...subscription,
    config: parseBalanceSubscriptionConfig(subscription.config),
  }));
}

import type { Prisma } from "@prisma/client";
import { prisma } from "../client";
import type { BalanceSubscriptionConfig } from "../../schemas/balance-subscription-config";

interface CreateBalanceSubscriptionParams {
  chainId: string;
  contractAddress?: string;
  walletAddress: string;
  config: BalanceSubscriptionConfig;
  webhookId?: number;
}

export async function createBalanceSubscription({
  chainId,
  contractAddress,
  walletAddress,
  config,
  webhookId,
}: CreateBalanceSubscriptionParams) {
  // Check if a non-deleted subscription already exists
  const existingSubscription = await prisma.balanceSubscriptions.findFirst({
    where: {
      chainId,
      contractAddress,
      walletAddress,
      deletedAt: null,
    },
  });

  if (existingSubscription) {
    // Update the existing subscription
    return await prisma.balanceSubscriptions.update({
      where: {
        id: existingSubscription.id,
      },
      data: {
        config: config as Prisma.InputJsonValue,
        webhookId,
      },
      include: {
        webhook: true,
      },
    });
  }

  // Create a new subscription
  return await prisma.balanceSubscriptions.create({
    data: {
      chainId,
      contractAddress,
      walletAddress,
      config: config as Prisma.InputJsonValue,
      webhookId,
    },
    include: {
      webhook: true,
    },
  });
} 
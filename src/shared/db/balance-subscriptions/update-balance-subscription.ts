import type { Prisma } from "@prisma/client";
import { prisma } from "../client";
import type { BalanceSubscriptionConfig } from "../../schemas/balance-subscription-config";

interface UpdateBalanceSubscriptionParams {
  id: string;
  chainId?: string;
  contractAddress?: string | null;
  walletAddress?: string;
  config?: BalanceSubscriptionConfig;
  webhookId?: number | null;
}

export async function updateBalanceSubscription({
  id,
  chainId,
  contractAddress,
  walletAddress,
  config,
  webhookId,
}: UpdateBalanceSubscriptionParams) {
  return await prisma.balanceSubscriptions.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      ...(chainId && { chainId }),
      ...(contractAddress !== undefined && { contractAddress }),
      ...(walletAddress && { walletAddress: walletAddress.toLowerCase() }),
      ...(config && { config: config as Prisma.InputJsonValue }),
      ...(webhookId !== undefined && { webhookId }),
    },
    include: {
      webhook: true,
    },
  });
} 
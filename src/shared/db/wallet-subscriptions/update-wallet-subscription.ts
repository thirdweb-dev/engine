import type { Prisma } from "@prisma/client";
import { prisma } from "../client";
import type { WalletConditions } from "../../schemas/wallet-subscription-conditions";
import { validateConditions } from "../../schemas/wallet-subscription-conditions";
import { WebhooksEventTypes } from "../../schemas/webhooks";
import { getWebhook } from "../webhooks/get-webhook";

interface UpdateWalletSubscriptionParams {
  id: string;
  chainId?: string;
  walletAddress?: string;
  conditions?: WalletConditions;
  webhookId?: number | null;
}

export async function updateWalletSubscription({
  id,
  chainId,
  walletAddress,
  conditions,
  webhookId,
}: UpdateWalletSubscriptionParams) {
  if (webhookId) {
    const webhook = await getWebhook(webhookId);
    if (!webhook) {
      throw new Error("Webhook not found");
    }
    if (webhook.revokedAt) {
      throw new Error("Webhook has been revoked");
    }
    if (webhook.eventType !== WebhooksEventTypes.WALLET_SUBSCRIPTION) {
      throw new Error("Webhook is not a wallet subscription webhook");
    }
  }

  return await prisma.walletSubscriptions.update({
    where: {
      id,
      deletedAt: null,
    },
    data: {
      ...(chainId && { chainId }),
      ...(walletAddress && { walletAddress: walletAddress.toLowerCase() }),
      ...(conditions && {
        conditions: validateConditions(conditions) as Prisma.InputJsonValue[],
      }),
      ...(webhookId !== undefined && { webhookId }),
    },
    include: {
      webhook: true,
    },
  });
}

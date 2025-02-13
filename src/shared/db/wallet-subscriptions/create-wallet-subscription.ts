import type { Prisma } from "@prisma/client";
import { prisma } from "../client";
import type { WalletConditions } from "../../schemas/wallet-subscription-conditions";
import { validateConditions } from "../../schemas/wallet-subscription-conditions";
import { getWebhook } from "../webhooks/get-webhook";
import { WebhooksEventTypes } from "../../schemas/webhooks";

interface CreateWalletSubscriptionParams {
  chainId: string;
  walletAddress: string;
  conditions: WalletConditions;
  webhookId?: number;
}

export async function createWalletSubscription({
  chainId,
  walletAddress,
  conditions,
  webhookId,
}: CreateWalletSubscriptionParams) {
  // Validate conditions
  const validatedConditions = validateConditions(conditions);

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

  // Create a new subscription
  return await prisma.walletSubscriptions.create({
    data: {
      chainId,
      walletAddress: walletAddress.toLowerCase(),
      conditions: validatedConditions as Prisma.InputJsonValue[],
      webhookId,
    },
    include: {
      webhook: true,
    },
  });
}

import { Type } from "@sinclair/typebox";
import type { WalletSubscriptions, Webhooks } from "@prisma/client";
import { AddressSchema } from "./address";
import {
  WalletConditionsSchema,
  validateConditions,
} from "../../shared/schemas/wallet-subscription-conditions";

type WalletSubscriptionWithWebhook = WalletSubscriptions & {
  webhook: Webhooks | null;
};

export const walletSubscriptionSchema = Type.Object({
  id: Type.String(),
  chainId: Type.String({
    description: "The chain ID of the subscription.",
  }),
  walletAddress: AddressSchema,
  conditions: WalletConditionsSchema,
  webhook: Type.Optional(
    Type.Object({
      url: Type.String(),
    }),
  ),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type WalletSubscriptionSchema = typeof walletSubscriptionSchema;

export function toWalletSubscriptionSchema(
  subscription: WalletSubscriptionWithWebhook,
) {
  return {
    id: subscription.id,
    chainId: subscription.chainId,
    walletAddress: subscription.walletAddress,
    conditions: validateConditions(subscription.conditions),
    webhook:
      subscription.webhookId && subscription.webhook
        ? {
            url: subscription.webhook.url,
          }
        : undefined,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

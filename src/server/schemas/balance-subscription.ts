import { Type } from "@sinclair/typebox";
import type { Prisma, Webhooks } from "@prisma/client";
import { AddressSchema } from "./address";
import { chainIdOrSlugSchema } from "./chain";
import { balanceSubscriptionConfigSchema, balanceSubscriptionConfigZodSchema } from "../../shared/schemas/balance-subscription-config";

interface BalanceSubscriptionWithWebhook {
  id: string;
  chainId: string;
  contractAddress: string | null;
  walletAddress: string;
  config: Prisma.JsonValue;
  webhookId: number | null;
  webhook: Webhooks | null;
  createdAt: Date;
  updatedAt: Date;
}

export const balanceSubscriptionSchema = Type.Object({
  id: Type.String(),
  chain: chainIdOrSlugSchema,
  contractAddress: Type.Optional(AddressSchema),
  walletAddress: AddressSchema,
  config: balanceSubscriptionConfigSchema,
  webhook: Type.Optional(
    Type.Object({
      url: Type.String(),
    }),
  ),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type BalanceSubscriptionSchema = typeof balanceSubscriptionSchema;

export function toBalanceSubscriptionSchema(subscription: BalanceSubscriptionWithWebhook) {
  return {
    id: subscription.id,
    chain: subscription.chainId,
    contractAddress: subscription.contractAddress ?? undefined,
    walletAddress: subscription.walletAddress,
    config: balanceSubscriptionConfigZodSchema.parse(subscription.config),
    webhook: subscription.webhookId && subscription.webhook
      ? {
          url: subscription.webhook.url,
        }
      : undefined,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
} 
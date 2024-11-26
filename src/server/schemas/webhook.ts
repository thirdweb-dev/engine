import type { Webhooks } from "@prisma/client";
import { type Static, Type } from "@sinclair/typebox";

export const WebhookSchema = Type.Object({
  id: Type.Integer(),
  url: Type.String(),
  name: Type.Union([Type.String(), Type.Null()]),
  secret: Type.Optional(Type.String()),
  eventType: Type.String(),
  active: Type.Boolean(),
  createdAt: Type.String(),
});

export const toWebhookSchema = (
  webhook: Webhooks,
): Static<typeof WebhookSchema> => ({
  url: webhook.url,
  name: webhook.name,
  eventType: webhook.eventType,
  secret: webhook.secret,
  createdAt: webhook.createdAt.toISOString(),
  active: !webhook.revokedAt,
  id: webhook.id,
});

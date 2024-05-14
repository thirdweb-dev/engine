import { Webhooks } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";

export const WebhookSchema = Type.Object({
  url: Type.String(),
  name: Type.Union([Type.String(), Type.Null()]),
  secret: Type.Optional(Type.String()),
  eventType: Type.String(),
  active: Type.Boolean(),
  createdAt: Type.String(),
  id: Type.Number(),
});

export const toWebhookSchema = (
  webhook: Webhooks,
): Static<typeof WebhookSchema> => ({
  url: webhook.url,
  name: webhook.name,
  eventType: webhook.eventType,
  secret: webhook.secret ? webhook.secret : undefined,
  createdAt: webhook.createdAt.toISOString(),
  active: webhook.revokedAt ? false : true,
  id: webhook.id,
});

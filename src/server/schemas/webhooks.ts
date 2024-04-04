import { Webhooks } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";

export const WebhookResponseSchema = Type.Object({
  id: Type.String(),
  url: Type.String(),
  name: Type.Union([Type.String(), Type.Null()]),
  secret: Type.String(),
  eventType: Type.String(),
  active: Type.Boolean(),
  createdAt: Type.String(),
});

export const toWebhookResponse = (
  raw: Webhooks,
): Static<typeof WebhookResponseSchema> => {
  console.log("[DEBUG] typeof raw.createdAt", typeof raw.createdAt);
  console.log(
    "[DEBUG] raw.createdAt.toISOString()",
    raw.createdAt.toISOString(),
  );

  return {
    ...raw,
    id: raw.id.toString(),
    active: !raw.revokedAt,
    createdAt: raw.createdAt.toISOString(),
  };
};

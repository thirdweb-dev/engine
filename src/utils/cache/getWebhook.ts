import { Webhooks } from "@prisma/client";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import { WebhooksEventTypes } from "../../schema/webhooks";

export const getWebhooksByType = async (
  type: WebhooksEventTypes,
): Promise<Webhooks[]> => {
  const allWebhooks = await getAllWebhooks();
  return allWebhooks.filter(
    (webhook) => !webhook.revokedAt && webhook.eventType === type,
  );
};

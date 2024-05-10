import { Webhooks } from "@prisma/client";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import { WebhooksEventTypes } from "../../schema/webhooks";

export const webhookCache = new Map<string, Webhooks[]>();

export const getWebhook = async (
  eventType: WebhooksEventTypes,
  retrieveFromCache = true,
): Promise<Webhooks[]> => {
  const cacheKey = eventType;

  if (retrieveFromCache && webhookCache.has(cacheKey)) {
    return webhookCache.get(cacheKey) as Webhooks[];
  }

  const webhookConfig = await getAllWebhooks();

  const eventTypeWebhookDetails = webhookConfig.filter((webhook) => {
    if (!webhook.revokedAt && webhook.eventType === eventType) {
      return webhook;
    }
  });

  webhookCache.set(cacheKey, eventTypeWebhookDetails);
  return eventTypeWebhookDetails;
};

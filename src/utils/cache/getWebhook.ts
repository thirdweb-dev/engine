import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import {
  SanitizedWebHooksSchema,
  WebhooksEventTypes,
} from "../../schema/webhooks";

export const webhookCache = new Map<string, SanitizedWebHooksSchema[]>();

export const getWebhook = async (
  eventType: WebhooksEventTypes,
  retrieveFromCache = true,
): Promise<SanitizedWebHooksSchema[] | undefined> => {
  const cacheKey = eventType;
  if (retrieveFromCache) {
    if (webhookCache.has(cacheKey) && webhookCache.get(cacheKey)) {
      return webhookCache.get(cacheKey) as SanitizedWebHooksSchema[];
    } else {
      return undefined;
    }
  }

  const webhookConfig = await getAllWebhooks();

  const eventTypeWebhookDetails = webhookConfig.filter((webhook) => {
    if (webhook.active && webhook.eventType === eventType) {
      return webhook;
    }
  });

  if (eventTypeWebhookDetails.length === 0) {
    webhookCache.delete(cacheKey);
    return undefined;
  }

  webhookCache.set(cacheKey, eventTypeWebhookDetails);
  return eventTypeWebhookDetails;
};

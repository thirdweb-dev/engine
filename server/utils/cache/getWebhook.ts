import { getAllWebhooks } from "../../../src/db/webhooks/getAllWebhooks";
import {
  SanitizedWebHooksSchema,
  WebhooksEventTypes,
} from "../../../src/schema/webhooks";

interface WebhookConfig {
  url: string;
  secret?: string;
}

export const webhookCache = new Map<string, SanitizedWebHooksSchema>();

export const getWebhookConfig = async (
  eventType: WebhooksEventTypes,
): Promise<SanitizedWebHooksSchema | undefined> => {
  const cacheKey = eventType;
  if (webhookCache.has(cacheKey) && webhookCache.get(cacheKey)) {
    return webhookCache.get(cacheKey) as SanitizedWebHooksSchema;
  }

  const webhookConfig = await getAllWebhooks();

  const eventTypeWebhookDetails = webhookConfig.filter((webhook) => {
    if (webhook.active && webhook.eventType === eventType) {
      return webhook;
    }
  });

  if (eventTypeWebhookDetails.length === 0) {
    return undefined;
  }

  webhookCache.set(cacheKey, eventTypeWebhookDetails[0]);
  return eventTypeWebhookDetails[0];
};

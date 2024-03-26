import { getRedisClient } from "../../db/client";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import {
  SanitizedWebHooksSchema,
  WebhooksEventTypes,
} from "../../schema/webhooks";

export const getWebhook = async (
  eventType: WebhooksEventTypes,
  retrieveFromCache = true,
): Promise<SanitizedWebHooksSchema[]> => {
  const webhookConfig = await getAllWebhooks();

  const eventTypeWebhookDetails = webhookConfig.filter((webhook) => {
    if (webhook.active && webhook.eventType === eventType) {
      return webhook;
    }
  });

  return eventTypeWebhookDetails;
};

export const clearWebhookCache = async (): Promise<void> => {
  const redisClient = await getRedisClient();
  redisClient.del("webhook:*");
};

import { getRedis } from "../../db/client";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import {
  SanitizedWebHooksSchema,
  WebhooksEventTypes,
} from "../../schema/webhooks";

export const getWebhook = async (
  eventType: WebhooksEventTypes,
  retrieveFromCache = true,
): Promise<SanitizedWebHooksSchema[]> => {
  const cacheKey = `webhook-${eventType}`;
  const redisClient = await getRedis();
  const cachedWebhooks = await redisClient.hmget(cacheKey);
  console.log(cachedWebhooks, cacheKey);
  if (retrieveFromCache && !cachedWebhooks) {
    return JSON.parse(cachedWebhooks);
  }

  const webhookConfig = await getAllWebhooks();

  const eventTypeWebhookDetails = webhookConfig.filter((webhook) => {
    if (webhook.active && webhook.eventType === eventType) {
      return webhook;
    }
  });

  redisClient.hmset(cacheKey, JSON.stringify(eventTypeWebhookDetails));
  return eventTypeWebhookDetails;
};

export const clearWebhookCache = async (): Promise<void> => {
  const redisClient = await getRedis();
  redisClient.del("webhook-*");
};

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
  const cacheKey = `webhook:${eventType}`;
  const redisClient = await getRedisClient();
  const cachedWebhooks = await redisClient.hgetall(cacheKey);
  console.log("::Debug Log:: Cache Key: ", cacheKey);
  console.log("::Debug Log:: Cached Webhooks: ", cachedWebhooks);

  if (retrieveFromCache && !cachedWebhooks) {
    return JSON.parse(cachedWebhooks);
  }

  const webhookConfig = await getAllWebhooks();

  const eventTypeWebhookDetails = webhookConfig.filter((webhook) => {
    if (webhook.active && webhook.eventType === eventType) {
      return webhook;
    }
  });

  redisClient.hset(cacheKey, JSON.stringify(eventTypeWebhookDetails));
  return eventTypeWebhookDetails;
};

export const clearWebhookCache = async (): Promise<void> => {
  const redisClient = await getRedisClient();
  redisClient.del("webhook:*");
};

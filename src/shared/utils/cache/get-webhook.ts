import type { Webhooks } from "@prisma/client";
import { getAllWebhooks } from "../../db/webhooks/get-all-webhooks.js";
import type { WebhooksEventTypes } from "../../schemas/webhooks.js";
import { LRUCache } from "lru-cache";

export const webhookCache = new LRUCache<string, Webhooks[]>({ max: 2048 });

export const getWebhooksByEventType = async (
  eventType: WebhooksEventTypes,
  retrieveFromCache = true,
): Promise<Webhooks[]> => {
  const cacheKey = eventType;

  if (retrieveFromCache && webhookCache.has(cacheKey)) {
    return webhookCache.get(cacheKey) as Webhooks[];
  }

  const filteredWebhooks = (await getAllWebhooks()).filter(
    (webhook) => webhook.eventType === eventType,
  );

  webhookCache.set(cacheKey, filteredWebhooks);
  return filteredWebhooks;
};

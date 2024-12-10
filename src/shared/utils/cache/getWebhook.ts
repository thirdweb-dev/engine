import type { Webhooks } from "@prisma/client";
import LRUMap from "mnemonist/lru-map";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import type { WebhooksEventTypes } from "../../schemas/webhooks";

export const webhookCache = new LRUMap<string, Webhooks[]>(2048);

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

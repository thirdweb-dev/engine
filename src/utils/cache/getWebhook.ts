import { Webhooks } from "@prisma/client";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import { WebhooksEventTypes } from "../../schema/webhooks";

export const webhookCache = new Map<string, Webhooks[]>();

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

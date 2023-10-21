import { webhookCache } from "../../../server/utils/cache/getWebhook";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { prisma } from "../client";

interface CreateWebhooksParams {
  url: string;
  name: string;
  eventType: WebhooksEventTypes;
  secret?: string;
}

export const insertWebhook = async ({
  url,
  name,
  eventType,
  secret,
}: CreateWebhooksParams) => {
  const webhooksData = {
    url,
    name,
    eventType,
    secret,
  };

  // Clear Cache
  webhookCache.clear();

  return prisma.webhooks.create({
    data: {
      url: webhooksData.url,
      name: webhooksData.name,
      eventType: webhooksData.eventType,
      secret: webhooksData.secret,
    },
  });
};

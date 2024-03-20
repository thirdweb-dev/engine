import { SanitizedWebHooksSchema, Webhook } from "../../schema/webhooks";
import { getRedisClient } from "../client";

export const getAllWebhooks = async (): Promise<SanitizedWebHooksSchema[]> => {
  const redisClient = await getRedisClient();
  const cachedWebhookIds = await redisClient.keys("webhook:*");

  if (cachedWebhookIds.length === 0) {
    return [];
  }
  const cachedWebhooks: Webhook[] = [];
  await Promise.all(
    cachedWebhookIds.map(async (id) => {
      const webhook = (await redisClient.hgetall(id)) as unknown as Webhook;
      if (!webhook.revokedAt) {
        cachedWebhooks.push(webhook);
      }
    }),
  );

  return sanitizeData(cachedWebhooks);
};

const sanitizeData = (data: Webhook[]): SanitizedWebHooksSchema[] => {
  return data.map((webhook) => {
    return {
      ...webhook,
      name: webhook.name || null,
      secret: webhook.secret ? webhook.secret : undefined,
      active: webhook.revokedAt ? false : true,
      createdAt: new Date(webhook.createdAt).toISOString(),
      updatedAt: webhook.updatedAt
        ? new Date(webhook.updatedAt).toISOString()
        : null,
      revokedAt: webhook.revokedAt
        ? new Date(webhook.revokedAt).toISOString()
        : null,
    };
  });
};

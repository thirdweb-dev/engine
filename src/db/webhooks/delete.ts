import { cacheKeyAllWebhooks, invalidateCache } from "../../utils/redis/cache";
import { prisma } from "../client";

export const deleteWebhook = async (id: number) => {
  const now = new Date();
  const webhook = prisma.webhooks.update({
    where: {
      id,
    },
    data: {
      revokedAt: now,
      updatedAt: now,
    },
  });

  const key = cacheKeyAllWebhooks();
  await invalidateCache(key);
  return webhook;
};

import { Webhooks } from "@prisma/client";
import {
  cacheKeyAllWebhooks,
  getCache,
  setCache,
} from "../../utils/redis/cache";
import { prisma } from "../client";

export const getAllWebhooks = async (): Promise<Webhooks[]> => {
  const key = cacheKeyAllWebhooks();
  const cached = await getCache<Webhooks[]>(key);
  if (cached) {
    return cached;
  }

  const allWebhooks = await prisma.webhooks.findMany({
    orderBy: { id: "asc" },
  });
  await setCache(key, allWebhooks);

  return allWebhooks;
};

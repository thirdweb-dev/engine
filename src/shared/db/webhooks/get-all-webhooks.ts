import type { Webhooks } from "@prisma/client";
import { prisma } from "../client.js";

export const getAllWebhooks = async (): Promise<Webhooks[]> => {
  return await prisma.webhooks.findMany({
    where: {
      revokedAt: null,
    },
    orderBy: {
      id: "asc",
    },
  });
};

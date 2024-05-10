import { Webhooks } from "@prisma/client";
import { prisma } from "../client";

export const getAllWebhooks = async (): Promise<Webhooks[]> => {
  return await prisma.webhooks.findMany({
    orderBy: {
      id: "asc",
    },
  });
};

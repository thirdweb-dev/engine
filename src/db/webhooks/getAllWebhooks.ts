import { Webhooks } from "@prisma/client";
import { SanitizedWebHooksSchema } from "../../schema/webhooks";
import { prisma } from "../client";

export const getAllWebhooks = async (): Promise<SanitizedWebHooksSchema[]> => {
  let webhooks = await prisma.webhooks.findMany({
    orderBy: {
      id: "asc",
    },
  });

  return sanitizeData(webhooks);
};

const sanitizeData = (data: Webhooks[]): SanitizedWebHooksSchema[] => {
  return data.map((webhook) => {
    return {
      url: webhook.url,
      name: webhook.name,
      eventType: webhook.eventType,
      secret: webhook.secret ? webhook.secret : undefined,
      createdAt: webhook.createdAt.toISOString(),
      active: webhook.revokedAt ? false : true,
      id: webhook.id,
    };
  });
};

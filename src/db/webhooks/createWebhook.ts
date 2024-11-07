import type { Webhooks } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import type { WebhooksEventTypes } from "../../schema/webhooks";
import { prisma } from "../client";

interface CreateWebhooksParams {
  url: string;
  name?: string;
  eventType: WebhooksEventTypes;
}

export const insertWebhook = async ({
  url,
  name,
  eventType,
}: CreateWebhooksParams): Promise<Webhooks> => {
  // generate random bytes
  const bytes = randomBytes(4096);
  // hash the bytes to create the secret (this will not be stored by itself)
  const secret = createHash("sha512").update(bytes).digest("base64url");

  return prisma.webhooks.create({
    data: {
      url,
      name,
      eventType,
      secret,
    },
  });
};

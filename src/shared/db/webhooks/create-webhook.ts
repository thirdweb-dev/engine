import type { Prisma, Webhooks } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import type { WebhooksEventTypes } from "../../schemas/webhooks";
import { prisma } from "../client";

export interface CreateWebhooksParams {
  url: string;
  name?: string;
  eventType: WebhooksEventTypes;
  config?: Prisma.InputJsonValue | undefined;
}

export const insertWebhook = async ({
  url,
  name,
  eventType,
  config,
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
      config,
    },
  });
};

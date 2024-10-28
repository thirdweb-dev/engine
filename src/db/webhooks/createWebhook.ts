import type { Prisma, Webhooks } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../client";

export const insertWebhook = async (
  args: Omit<Prisma.WebhooksCreateInput, "secret">,
): Promise<Webhooks> => {
  // Generate a webhook secret.
  const bytes = randomBytes(4096);
  const secret = createHash("sha512").update(bytes).digest("base64url");

  return prisma.webhooks.create({
    data: {
      ...args,
      secret,
    },
  });
};

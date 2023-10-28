import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../server/middleware/error";
import { webhookCache } from "../../utils/cache/getWebhook";
import { prisma } from "../client";

interface RevokeWebhooksParams {
  id: number;
}

export const markWebhookAsRevoked = async ({ id }: RevokeWebhooksParams) => {
  // Clear Cache
  webhookCache.clear();
  const currentTimestamp = new Date();

  const exists = await prisma.webhooks.findUnique({
    where: {
      id,
    },
  });

  if (!exists)
    throw createCustomError(
      `Webhook with id ${id} does not exist`,
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );

  return prisma.webhooks.update({
    where: {
      id,
    },
    data: {
      revokedAt: currentTimestamp,
      updatedAt: currentTimestamp,
    },
  });
};

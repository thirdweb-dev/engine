import { webhookCache } from "../../../server/utils/cache/getWebhook";
import { prisma } from "../client";

interface RevokeWebhooksParams {
  id: number;
}

export const markWebhookAsRevoked = async ({ id }: RevokeWebhooksParams) => {
  // Clear Cache
  webhookCache.clear();
  const currentTimestamp = new Date();
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

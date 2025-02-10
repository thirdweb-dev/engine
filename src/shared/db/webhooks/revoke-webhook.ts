import { prisma } from "../client.js";

export const deleteWebhook = async (id: number) => {
  const now = new Date();

  return prisma.webhooks.update({
    where: { id },
    data: {
      revokedAt: now,
      updatedAt: now,
    },
  });
};

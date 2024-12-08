import { prisma } from "../client";

export const getWebhook = async (id: number) => {
  return await prisma.webhooks.findUnique({
    where: { id },
  });
};

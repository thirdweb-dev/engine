import { prisma } from "../client.js";

export const getWebhook = async (id: number) => {
  return await prisma.webhooks.findUnique({
    where: { id },
  });
};

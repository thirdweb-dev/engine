import { prisma } from "../client";

export const deleteContractSubscription = async (id: string) => {
  return prisma.contractSubscriptions.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
};

import { prisma } from "../client";

export const getContractSubscription = async ({ id }: { id: string }) => {
  const contractSubscription = await prisma.contractSubscriptions.findFirst({
    where: {
      id,
    },
  });

  return contractSubscription;
};

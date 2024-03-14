import { prisma } from "../client";

interface RemoveContractSubscriptionParams {
  chainId: number;
  contractAddress: string;
}

export const deleteContractSubscription = async ({
  chainId,
  contractAddress,
}: RemoveContractSubscriptionParams) => {
  return prisma.contractSubscriptions.updateMany({
    where: {
      chainId,
      contractAddress,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });
};

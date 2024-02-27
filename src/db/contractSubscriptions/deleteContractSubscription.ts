import { prisma } from "../client";

interface RemoveContractSubscriptionParams {
  chainId: number;
  contractAddress: string;
}

export const deleteContractSubscription = async ({
  chainId,
  contractAddress,
}: RemoveContractSubscriptionParams) => {
  return prisma.contractSubscriptions.delete({
    where: {
      chainId_contractAddress: {
        chainId,
        contractAddress,
      },
    },
  });
};

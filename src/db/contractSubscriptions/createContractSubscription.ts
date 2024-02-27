import { prisma } from "../client";

interface UpsertContractSubscriptionParams {
  chainId: number;
  contractAddress: string;
}

export const upsertContractSubscription = async ({
  chainId,
  contractAddress,
}: UpsertContractSubscriptionParams) => {
  return prisma.contractSubscriptions.upsert({
    where: {
      chainId_contractAddress: {
        chainId,
        contractAddress,
      },
    },
    update: {
      chainId,
      contractAddress,
    },
    create: { chainId, contractAddress },
  });
};

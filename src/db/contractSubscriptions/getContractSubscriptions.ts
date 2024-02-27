import { prisma } from "../client";

export const getContractSubscriptionsByChainId = async (chainId: number) => {
  return await prisma.contractSubscriptions.findMany({
    where: {
      chainId,
    },
  });
};

export const getAllContractSubscriptions = async () => {
  return await prisma.contractSubscriptions.findMany();
};

export const getContractSubscriptionsUniqueChainIds = async () => {
  const uniqueChainIds = await prisma.contractSubscriptions.findMany({
    distinct: ["chainId"],
    select: {
      chainId: true,
    },
  });

  return uniqueChainIds.map((contract) => contract.chainId);
};

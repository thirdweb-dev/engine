import { prisma } from "../client";

export interface GetContractSubscriptionsParams {
  chainId: number;
  contractAddress: string;
}

export const isContractSubscribed = async ({
  chainId,
  contractAddress,
}: GetContractSubscriptionsParams) => {
  const contractSubscription = await prisma.contractSubscriptions.findFirst({
    where: {
      chainId: chainId.toString(),
      contractAddress,
      deletedAt: null,
    },
  });
  return contractSubscription !== null;
};

export const getContractSubscriptionsByChainId = async (
  chainId: number,
  includeWebhook = false,
) => {
  return await prisma.contractSubscriptions.findMany({
    where: {
      chainId: chainId.toString(),
      deletedAt: null,
    },
    include: {
      webhook: includeWebhook,
    },
  });
};

export const getAllContractSubscriptions = async () => {
  return await prisma.contractSubscriptions.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      webhook: true,
    },
  });
};

export const getContractSubscriptionsUniqueChainIds = async () => {
  const uniqueChainIds = await prisma.contractSubscriptions.findMany({
    distinct: ["chainId"],
    select: {
      chainId: true,
    },
    where: {
      deletedAt: null,
    },
  });

  return uniqueChainIds.map((contract) => Number.parseInt(contract.chainId));
};
